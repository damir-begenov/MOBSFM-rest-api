const express = require('express');
const router = express.Router();
const pgp = require('pg-promise')();
const xml2js = require('xml2js');
const Organization = require('../classes/organization.js');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const {auth} = require("firebase-admin");
var randtoken = require('rand-token')
const {or} = require("sequelize");

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const connectionString = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const db = pgp(connectionString);

router.use(express.json());

router.get('/api', (req, res) => {
    res.status(200).send({
        success: true,
    });
});

router.post('/certificate', (req, res) => {
    const {organization_id} = req.body;
    db.task(async t => {
        const certificate_main = await t.manyOrNone('SELECT * FROM certificate where organization_id = $1 ',[organization_id]);
        const certificate_additional = await t.manyOrNone('SELECT * FROM certificate where organization_id = $1 and type_certificate = \'additional\'',[organization_id]);
        res.json({
            certificate_main: certificate_main,
            certificate_additional: certificate_additional
        })
    });
});

router.post('/regulatory_document', (req, res) => {
    const {organization_id} = req.body;
    db.task(async t => {
        const regulatory_document_cur = await t.manyOrNone(`SELECT * FROM regulatory_document 
        where organization_id = $1 and type_document = 'cur'`,[organization_id]);
        const regulatory_document_pvk = await t.manyOrNone(`SELECT * FROM regulatory_document 
        where organization_id = $1 and type_document = 'pvk'`,[organization_id]);

        res.json({
            regulatory_document_cur: regulatory_document_cur,
            regulatory_document_pvk: regulatory_document_pvk
        })
    });
});


router.post('/assessment', (req, res) => {
    const {organization_id} = req.body;
    db.task(async t => {
        const        assessments = await t.manyOrNone(`SELECT * FROM assessments_assessment 
         INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id 
         INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
         INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
         WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1;`, [organization_id]);
         const assessment_activity = await t.manyOrNone(`SELECT
         assessments_assessmentitemcategory.code AS category_code,
         SUM(assessments_assessmentitem.point) AS total_points
       FROM assessments_assessment
       INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
       INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
       INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
       WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1
         AND assessments_assessmentitemcategory.code = 'activity' 
       GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
       if (assessment_activity.length > 0) {
         assessment_activity[0]['category_code'] = 'Активность';
       }
         const assessment_obedience = await t.manyOrNone(`SELECT
         assessments_assessmentitemcategory.code AS category_code,
         SUM(assessments_assessmentitem.point) AS total_points
       FROM assessments_assessment
       INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
       INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
       INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
       WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1
         AND assessments_assessmentitemcategory.code = 'obedience'
       GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
       if (assessment_obedience.length > 0) {
         assessment_obedience[0]['category_code']  = 'Законопослушность';
       }
         const assessment_main_info = await t.manyOrNone(`SELECT
         assessments_assessmentitemcategory.code AS category_code,
         SUM(assessments_assessmentitem.point) AS total_points
       FROM assessments_assessment
       INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
       INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
       INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
       WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1
         AND assessments_assessmentitemcategory.code = 'main_info'
       GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
       if (assessment_main_info.length > 0) {
         assessment_main_info[0]['category_code']  = 'Общие данные';
       }
         const assessment_regulator_documents = await t.manyOrNone(`SELECT
         assessments_assessmentitemcategory.code AS category_code,
         SUM(assessments_assessmentitem.point) AS total_points
       FROM assessments_assessment
       INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
       INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
       INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
       WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1
         AND assessments_assessmentitemcategory.code = 'regulator_documents'
       GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
       if (assessment_regulator_documents.length > 0) {
         assessment_regulator_documents[0]['category_code']  = 'Регламентирующие документы';}
         const assessment_fin = await t.manyOrNone(`SELECT
         assessments_assessmentitemcategory.code AS category_code,
         SUM(assessments_assessmentitem.point) AS total_points
       FROM assessments_assessment
       INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
       INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
       INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
       WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
         AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
         AND assessments_assessment.organization_id = $1
         AND assessments_assessmentitemcategory.code = 'fin_monitoring_operations'
       GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
       if (assessment_fin.length > 0) {
       assessment_fin[0]['category_code'] = 'Операции фин.мониторинга';}
         const assessment_qualification_sum = await t.manyOrNone(`SELECT
            assessments_assessmentitemcategory.code AS category_code,
            SUM(assessments_assessmentitem.point) AS total_points
          FROM assessments_assessment
          INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
          INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
          INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
          WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
            AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
            AND assessments_assessment.organization_id = $1
            AND assessments_assessmentitemcategory.code = 'qualification'
          GROUP BY assessments_assessmentitemcategory.code;`, [organization_id]);
          if (assessment_qualification_sum.length > 0) {
          assessment_qualification_sum[0]['category_code'] = 'Квалификация';}
          const all_points = await t.manyOrNone(`SELECT
          SUM(assessments_assessmentitem.point) AS total_points
        FROM assessments_assessment
        INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
        INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
        INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
        WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
          AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
          AND assessments_assessment.organization_id = $1 ;`, [organization_id]);
          const all_points_2 = await t.manyOrNone(`WITH RECURSIVE months AS (
            SELECT date_trunc('month', MIN(assessments_assessment.date)) AS month
            FROM assessments_assessment
            WHERE assessments_assessment.organization_id = $1
            UNION ALL
            SELECT month + INTERVAL '1 month'
            FROM months
            WHERE month < date_trunc('month', current_date)
          )
          SELECT
            months.month,
            SUM(assessments_assessmentitem.point) AS total_points
          FROM
            months
          LEFT JOIN assessments_assessment ON date_trunc('month', assessments_assessment.date) = months.month
          LEFT JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
          LEFT JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
          LEFT JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
          WHERE
            assessments_assessment.organization_id = $1
          GROUP BY
            months.month
          ORDER BY
            months.month;`, [organization_id]);
          //   const all_points = assessment_qualification_sum[0]['total_points'] + assessment_fin[0]['total_points'] + assessment_regulator_documents[0]['total_points'] + assessment_main_info[0]['total_points'];
        res.json({
            assessments: assessments,
            assessment_activity_sum: assessment_activity,
            assessment_obedience_sum: assessment_obedience,
            assessment_main_info_sum: assessment_main_info,
            assessment_regulator_documents_sum: assessment_regulator_documents,
            assessment_fin_sum: assessment_fin,
            assessment_qualification_sum: assessment_qualification_sum,
            total_points: all_points,
            total_points_2 : all_points_2
        }) 
    }).catch(err => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    })
});

router.post('/fm1_sfm', (req, res) => {
    const {iin} = req.body;
    db.task(async t => {
        const fm1 = await t.manyOrNone(`SELECT * FROM fm1_sfm where iin = '$1'`, [iin]);
        res.json({
            fm1: fm1,
        })
    }).catch(err => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    })
})

router.post('/ohvat', (req,res) => {
    const {bin} = req.body;
    db.task(async t => {
        const ohvat = await t.manyOrNone(`SELECT * FROM directories_organizationcontrolledsubject
                                          where bin = $1`, [bin]);
        const fff = ohvat[0]['controlled_subject_codes'];
        var length = fff.length;
        const code_types = [];
        const organization_ohvat_accepted = [];
        for (var i = 0; i < length; i++) {
            // Do something with 'item', which represents each element of the array
            try {
                const codetype = await t.manyOrNone(`SELECT * FROM directories_codetype
                                                     where code = $1`, [fff[i]]);
                const organization_ohvat = await t.manyOrNone(`SELECT count(*) FROM accounts_organization
                                                               where subject_code_id = $1 and status = 'approved'`, [codetype[0]['id']]);
                codetype[0]['countapproved'] = parseFloat(organization_ohvat[0]['count']);
                codetype[0]['procents_of_org_names'] = (codetype[0]['count']*100)/parseFloat(organization_ohvat[0]['count']);
                code_types.push(codetype);
                organization_ohvat_accepted.push(organization_ohvat);
                if (codetype.length === 0) {
                    // Handle the case when code is not found in directories_codetype table
                    // For example, you could skip it or log an error message.
                    console.log(`Code ${controlled[i]} not found in directories_codetype table.`);
                    continue;
                }
                code_types.push(codetype);
            } catch (error) {
                // Handle the error if the query fails for any reason
                console.error(`Error while querying directories_codetype: ${error.message}`);
            }
        }
        res.json({
            ohvat: ohvat,
            code_types: code_types,
            organization_ohvat_accepted: organization_ohvat_accepted
        })
    }).catch(err => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    })
})


router.get('/risk', (req, res) => {
    db.task(async t => {
        const risk = await t.manyOrNone('SELECT * FROM mutual_evaluation_mutualevaluationmaterialcategory');
        const risk_category_material = await t.manyOrNone('SELECT ec.name as nameaac, ec.name_kk as nameaac_kk, eem.* , eef.file as filee FROM mutual_evaluation_mutualevaluationmaterial AS eem INNER JOIN mutual_evaluation_materialfile AS eef ON eem.id = eef.material_id INNER JOIN mutual_evaluation_mutualevaluationmaterialcategory AS ec ON eem.category_id = ec.id')
        res.json({
            risk: risk,
            risk_category_material: risk_category_material
        })
    }).catch(err => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    })
})

router.get('/fatf', (req, res) => {
    db.task(async t => {
        const fatf = await t.manyOrNone('SELECT * FROM fatfs_fatfcategory');
        res.json({
            fatf: fatf,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    });
})

router.get('/getMessageCategories', (req, res) => {
    db.task(async t => {
        const messCategories = await t.many('SELECT * FROM correspondence_correspondencecategory');
        res.json({
            messCategories: messCategories,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error });
    });
})

router.post('/getSentMessages', (req, res) => {
    const {user_id} = req.body;
    db.task(async t => {
        const messSent = await t.many('SELECT * FROM correspondence where sender_user_id = $1', [user_id]);
        res.json({
            messSent: messSent,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error });
    });
})

router.post('/getReceivedMessages', (req, res) => {
    const {organization_id} = req.body;
    db.task(async t => {
        const messReceived = await t.many('SELECT c.id as cor_id, c.created_at as cor_created_at, c.changed_at as cor_changed_at, c.subject as cor_subject, c.description as cor_description, c.files as cor_files,org.iin as cor_sender_org_iin, org.full_name as cor_sender_org_full_name, us.first_name as cor_sender_user_first_name, us.last_name as cor_sender_user_last_name, cat.name as cor_category_name, cr.organization_id as cor_receiver_org_id, n.seen as is_seen, n.employee_id as notification_employee_id from correspondence c inner join correspondence_receiver cr on c.id = cr.correspondence_id inner join accounts_employee emp on emp.organization_id = $1 inner join notification n on c.id = n.correspondence_id and n.employee_id = emp.id inner join accounts_organization org on c.sender_organization_id = org.id inner join accounts_clientuser us on c.sender_user_id = us.id inner join correspondence_correspondencecategory cat on c.category_id = cat.id where cr.organization_id = $1', [organization_id]);
        res.json({
            messReceived: messReceived,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error });
    });
})

router.get('/faq', (req, res) => {
    db.task(async t => {
        const faq_category = await t.manyOrNone('SELECT * FROM category_faq');
        const faq = await t.manyOrNone('SELECT * FROM category_faq INNER JOIN faq ON faq.category_id = category_faq.id');
        res.json({
            faq_category: faq_category,
            faq: faq,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    });
})


router.get('/registry', (req, res) => {
    db.task(async t => {
        const registry = await t.manyOrNone('SELECT * FROM registry_registercontrolledentities');
        res.json({
            registry: registry,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    });
})





router.get('/education', (req, res) => {
    db.task(async t => {
        const education_category = await t.manyOrNone('SELECT * FROM education_category');
        const education_category_material = await t.manyOrNone('SELECT ec.name as nameaac, ec.name_kk as nameaac_kk, eem.* , eef.file as filee FROM education_educationmaterial AS eem INNER JOIN education_educationfile AS eef ON eem.id = eef.material_id INNER JOIN education_category AS ec ON eem.category_id = ec.id')
        
        res.json({
            education_category: education_category,
            education_category_material: education_category_material
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error' });
    });
});

router.get('/news', (req,res) => {
    db.task(async t => {
        const news = await t.manyOrNone('SELECT * FROM news_news WHERE authorized = false');
        res.json({
            news: news
        })
    }).catch(error =>{
        res.status(500).json({success: false});
    })
})

router.post('/getPdl', (req,res) => {
    const { iin } = req.body;
    db.task(async t => {
        const pdls = await t.manyOrNone('SELECT * FROM pdl_pdl where iin = $1', [iin]);
        res.json({
            pdls: pdls
        })
    }).catch(error =>{
        res.status(500).json({success: false,error: error});
    })
})

router.post('/getSubjectCodes', (req, res) => {
    const { org_id } = req.body;
    db.task(async (t) => {
        const controlled = await t.manyOrNone(
            `SELECT codetype_id FROM accounts_organization_subject_codes
       WHERE organization_id = $1`, [org_id]
        );

        // Extract the codetype_id values from the controlled array of objects and convert them to integers
        const controlledCodes = controlled.map(item => parseInt(item.codetype_id));

        const subject_codes = await t.manyOrNone('SELECT name FROM directories_codetype WHERE id = ANY($1)', [controlledCodes]);

        res.json({
            subject_codes: subject_codes
        });
    }).catch((error) => {
        res.status(500).json({ success: false, error: error });
    });
});




router.post('/getViolations', (req, res) => {
    const { org_id } = req.body;
    db.task(async t => {
        const controlled = await t.manyOrNone(
            `SELECT codetype_id FROM accounts_organization_subject_codes
       WHERE organization_id = $1`, [org_id]
        );

        // Extract the codetype_id values from the controlled array of objects
        const controlledCodes = controlled.map(item => item.codetype_id);

        const violations = await t.manyOrNone(
            'SELECT rv.id as rv_id, rv.created_at as rv_created_at, rv.changed_at as rv_changed_at, rv.iin as rv_iin, rv.amount as rv_amount, rv.description as rv_description, rv.article as rv_article, rv.date as rv_date, dc.code as dc_code, dc.name as dc_name, ao.iin as ao_iin  FROM rule_violation rv LEFT JOIN accounts_organization ao on rv.state_body_id = ao.id LEFT JOIN directories_codetype dc ON rv.subject_code_id = dc.id WHERE rv.subject_code_id = ANY($1::int[])',
            [controlledCodes]
        );


        res.json({
            violations: violations,
            regulated_codes: controlledCodes // Send the array of controlled codes to the client
        });
    }).catch(error => {
        res.status(500).json({ success: false, error: error });
    });
});


router.post('/section3Acategory', (req, res) => {
    const {category} = req.body;
    db.task(async t => {
        const category_content = await t.many('SELECT * FROM sanctions_sanctionterrorist WHERE category = $1', [category])

        res.json({
            category_content: category_content
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error});
    });
});



router.post('/section3Bcategory', (req, res) => {
    const {category} = req.body;

    if(category === "category_1"){
        db.task(async t => {
            const category_content = await t.many(`SELECT * FROM sanctions_weaponsanction WHERE category = 'dprk' or category = 'iran'`);
            const sanctionlog = await t.many(`SELECT * FROM sanctions_weaponsanctionlog`);
            res.json({
                category_content: category_content,
                sanctionlog: sanctionlog
            })
        }).catch(error => {
            res.status(500).json({ success: false, message: 'Internal server error', error: error});
        });
    }
    else if(category === "category_2"){
        db.task(async t => {
            const category_content = await t.many(`SELECT * FROM sanctions_weaponsanction WHERE category = 'isil' or category = 'taliban'`);
            const sanctionlog = await t.many(`SELECT * FROM sanctions_weaponsanctionlog`);
            res.json({
                category_content: category_content,
                sanctionlog: sanctionlog
            })
        }).catch(error => {
            res.status(500).json({ success: false, message: 'Internal server error', error: error});
        });
    }

});

router.post('/getQuestionnaires', (req, res) => {
    const { category, subject_code, organization_id } = req.body;

    db.task(async t => {
        const questionnaires = await t.many(`SELECT * FROM questionnaire_questionnaire qq  where qq.category = $1 and qq.id in (SELECT questionnaire_id FROM questionnaire_questionnaire_subject_codes where codetype_id = $2)`, [category, subject_code]);

        const completed_questionnaires = await t.manyOrNone(`SELECT questionnaire_id FROM questionnaire_questionnaireresult WHERE organization_id = $1`, [organization_id]);

        res.json({
            questionnaires: questionnaires,
            completed_questionnaires: completed_questionnaires
        });
    }).catch(error => {
        res.status(500).json({ success: false, error: error });
    });
});


router.post('/postResults', async (req, res) => {
    const { organization_id, questionnaire_id, testResults } = req.body;
    const now = new Date();

    try {
        // Parse the testResults string into an array of objects
        const parsedTestResults = JSON.parse(testResults);

        const questionnaireResultQuery = `
      INSERT INTO questionnaire_questionnaireresult (created_at, changed_at, organization_id, questionnaire_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
        const questionnaireResultValues = [now, now, organization_id, questionnaire_id];
        const { id: questionnaire_result_id } = await db.one(questionnaireResultQuery, questionnaireResultValues);

        const questionnaireAnswerValues = parsedTestResults.map((result) => [
            now,
            now,
            result.answer_text || '', // Ensure answer_text is not null
            result.answer_id || null,
            result.question_id,
            questionnaire_result_id,
        ]);

        const questionnaireAnswerQuery = `
      INSERT INTO questionnaire_organizationanswer (created_at, changed_at, answer_text, answer_id, question_id, questionnaire_result_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

        await db.tx(async (t) => {
            // Using transaction to execute all insert queries as a single unit of work
            const insertQueries = questionnaireAnswerValues.map((values) => t.none(questionnaireAnswerQuery, values));
            await t.batch(insertQueries);
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).json({ success: false, error: 'Error inserting data' });
    }
});

router.post('/getQuestions', (req, res) => {
    const { questionnaire_id } = req.body;
    db.task(async t => {
        const questions = await t.many(`
      SELECT qq.id, qq.created_at, qq.changed_at, qq.order, qq.text, qq.text_ru, qq.text_kk, qq.text_kaz, qq.questionnaire_id, 
             qa.id as answer_id, qa.created_at as answer_created_at, qa.changed_at as answer_changed_at, qa.order as answer_order, qa.text as answer_text, qa.text_ru as answer_text_ru, qa.text_kk as answer_text_kk, qa.text_kaz as answer_text_kaz, qa.question_id as answer_question_id
      FROM questionnaire_question qq 
      LEFT JOIN questionnaire_answer qa ON qq.id = qa.question_id
      WHERE qq.questionnaire_id = $1
      ORDER BY qq.order, qa.order
    `, [questionnaire_id]);

        // Group answers by question
        const groupedQuestions = {};
        questions.forEach(question => {
            const questionID = question.id;
            if (!groupedQuestions[questionID]) {
                groupedQuestions[questionID] = {
                    id: questionID,
                    created_at: question.created_at,
                    changed_at: question.changed_at,
                    order: question.order,
                    text: question.text,
                    text_ru: question.text_ru,
                    text_kk: question.text_kk,
                    text_kaz: question.text_kaz,
                    questionnaire_id: question.questionnaire_id,
                    answers: [],
                };
            }
            if (question.answer_id) {
                // Only add answer if it exists (not null)
                groupedQuestions[questionID].answers.push({
                    id: question.answer_id,
                    created_at: question.answer_created_at,
                    changed_at: question.answer_changed_at,
                    order: question.answer_order,
                    text: question.answer_text,
                    text_ru: question.answer_text_ru,
                    text_kk: question.answer_text_kk,
                    text_kaz: question.answer_text_kaz,
                    question_id: question.answer_question_id,
                });
            }
        });

        const finalQuestions = Object.values(groupedQuestions);

        res.json({
            questions: finalQuestions,
        });
    }).catch(error => {
        res.status(500).json({ success: false, error: error });
    });
});



router.get('/riskListCategory', (req, res) => {
    db.task(async t => {
        const sanctions_category = await t.manyOrNone('SELECT * FROM sanctions_sanctionothercategory');

        res.json({
            sanctions_sanctionothercategory: sanctions_category,
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error});
    });
});

router.post('/riskListContent', (req, res) => {
    const {name, status} = req.body;
    db.task(async t => {
        const sanctions_sanctionother = await t.manyOrNone
        ('SELECT * from sanctions_sanctionother a INNER JOIN sanctions_sanctionothercategory b ON a.category_id = b.id where b.name = $1 and a.status = $2', [name,status])

        res.json({
            sanctions_sanctionother: sanctions_sanctionother
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error});
    });
});

router.post('/riskListFiles', (req, res) => {
    const {name} = req.body;
    db.task(async t => {
        const sanctions_sanctionotherFiles = await t.manyOrNone('SELECT b.name, a.status from sanctions_sanctionother a INNER JOIN sanctions_sanctionothercategory b ON a.category_id = b.id where b.name = $1 group by b.name, a.status', [name])

        res.json({
            sanctions_sanctionotherFiles: sanctions_sanctionotherFiles
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error});
    });
});

router.post('/checkCountOrg', (req, res) => {
    const {iin, password} = req.body;
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM accounts_clientuser WHERE iin = $1', [iin]);
        if (user && user.id === password) {
            const organization = await t.many('SELECT a.id, a.iin, a.organization_registration_date, a.registration_date, a.full_name, a.full_name_ru, a.full_name_kk, a.full_name_kaz, a.short_name, a.short_name_ru, a.short_name_kk, a.short_name_kaz, a.oked, a."type", a.blocking, a.reason_blocking, a.form_of_law_id, a.org_form_id, a.org_size_id, a.aifc_member, a."blocked", a.document_unique_identifier, a.is_fm1, a.is_afm_employee, a.is_afm_supervisor, a.p12_sign, a.status, b.code, b."name", b.name_ru, b.name_kk, b.name_kaz, b.count FROM accounts_organization a LEFT JOIN directories_codetype b ON a.subject_code_id = b.id WHERE a.id IN (SELECT organization_id FROM accounts_employee WHERE client_user_id = $1)', [user['id']]);

            if (organization) {

                res.json({
                    success: true,
                    message: 'Checked for organizations',
                    organization: organization,
                    count: organization.length
                });
            } else {
                // Organization not found
                res.status(404).json({ success: false, message: 'Organization not found' });
            }
        } else {
            // Invalid credentials
            res.status(401).json({ success: false, message: 'Invalid iin' });
        }
    })
        .catch(error => {
            console.error('Error occurred while checking in:', error);
            res.status(500).json({ success: false, message: 'Internal server error', error: error });
        });
});


router.post('/checkSession', (req, res) => {
    const {iin, org_id} = req.body;
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM accounts_clientuser WHERE iin = $1', [iin]);
        if (user) {
            const token = jwt.sign(
                { user_id: user._id, iin },
    
                'chelovekpauk',
                {
                  expiresIn: "2h",
                }
              );
              // save user token
              user.token = token;
            const organization = await t.oneOrNone('SELECT * FROM accounts_organization WHERE id = $1', [org_id]);
            if (organization) {
                const cfmCode = organization['subject_code_id'];
                let docType = null;
                let user_document = null;
                let accounts_document_id = null;
                let org_address = null;
                let org_country = null;
                let org_district = null;
                let org_region = null;

                accounts_document_id = await t.oneOrNone('SELECT document_id FROM accounts_clientuser WHERE iin = $1', [iin]);
                if(accounts_document_id['document_id'] != null){
                    user_document = await t.oneOrNone('SELECT * FROM accounts_document WHERE id = $1', [accounts_document_id['document_id']]);
                    docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [user_document['type_document_id']]);
                    user.docType = docType['name'];
                    user.docNumber = user_document['number'];
                    user.docDateIssued = user_document['date_issue'];
                    user.docIssuedBy = user_document['issued_by'];
                    user.docSeries = user_document['series']
                }

                const userId = user['id'];
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE id = $1', [cfmCode]);

                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE id = $1', [org_id]);
                const userRole = await t.many('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);
                org_address = await t.oneOrNone('SELECT * FROM accounts_organizationaddres WHERE organization_id = $1', [organization['id']]);
                if(org_address!=null){
                    org_country = await t.oneOrNone('SELECT * FROM directories_country WHERE id = $1', [org_address['country_id']]);
                    org_district = await t.oneOrNone('SELECT * FROM directories_district WHERE id = $1', [org_address['district_id']]);
                    org_region = await t.oneOrNone('SELECT * FROM directories_region WHERE id = $1', [org_address['region_id']]);
                    org_address.country = org_country;
                    org_address.district = org_district;
                    org_address.region = org_region;
                    delete org_address.region_id;
                    delete org_address.district_id;
                }


                const persons = await t.many('SELECT * FROM accounts_employee a INNER JOIN accounts_clientuser b on a.client_user_id = b.id WHERE a.organization_id = $1',[organization['id']]);

                organization.persons = persons;
                if (subjectCode !== null && typeof subjectCode === 'object') {
                    organization.subjectCode = subjectCode['name'] ?? null;
                } else {
                    organization.subjectCode = null;
                }

                organization.orgType = orgType['type'];
                organization.address = org_address;

                user.userRole = userRole[0]['role'];

                const colors = {
                    reset: "\x1b[0m",
                    red: "\x1b[31m",
                    green: "\x1b[32m",
                    yellow: "\x1b[33m",
                    blue: "\x1b[34m",
                    magenta: "\x1b[35m",
                    cyan: "\x1b[36m",
                };

                function coloredLog(color, message) {
                    console.log(`${color}${message}${colors.reset}`);
                }
                const currentTime = new Date();

                coloredLog(colors.magenta, '---------------------------------------------')
                coloredLog(colors.green,'User is logged in at: ' + currentTime.toISOString())
                coloredLog(colors.green, '\n')
                coloredLog(colors.cyan,'User id: ' + user['id'])
                coloredLog(colors.cyan,'Users first name: ' + user['first_name'])
                coloredLog(colors.cyan,'Users last name: ' + user['last_name'])
                coloredLog(colors.cyan,'Users iin: ' + user['iin'])
                coloredLog(colors.green, ' ')
                // Authentication successful

                coloredLog(colors.yellow, 'Organization information: ')
                coloredLog(colors.yellow, '\n')
                coloredLog(colors.cyan, 'Organization id: ' + organization['id'])
                coloredLog(colors.cyan, 'Organization iin:: ' + organization['iin'])
                coloredLog(colors.cyan, 'Organization name: ' + organization['full_name'])
                coloredLog(colors.cyan, 'Organization type: ' + organization['orgType'])
                coloredLog(colors.cyan, 'Subject code: ' + organization['subjectCode'])
                coloredLog(colors.yellow, ' ')
                // Authentication successful
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: user,
                    organization: organization,
                });
            } else {
                // Organization not found
                res.status(404).json({ success: false, message: 'Organization not found' });
            }
        } else {
            // Invalid credentials
            res.status(401).json({ success: false, message: 'Invalid iin or password' });
        }
    })
        .catch(error => {
            console.error('Error occurred while logging in:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        });
});


var refreshTokens = {} 

router.post('/login', (req, res) => {
    const { iin, password, org_id } = req.body;
    // Query the database to validate the user's credentials and fetch additional data
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM accounts_clientuser WHERE "iin" = $1', [iin]);
        const token = jwt.sign(
            { user_id: user.iin, iin },
            'chelovekpauk',
            {
                expiresIn: "1h",
            }
        );

        // save user token
        user.token = token;
        var refreshToken = randtoken.uid(256) 
        refreshTokens[refreshToken] = iin;
        user.refreshToken = refreshToken;
        if (user && user.id === password) {
            const organization = await t.oneOrNone('SELECT * FROM accounts_organization WHERE id = $1', [org_id]);
            if (organization) {
                const cfmCode = organization['subject_code_id'];
                let docType = null;
                let user_document = null;
                let accounts_document_id = null;
                let org_address = null;
                let org_country = null;
                let org_district = null;
                let org_region = null;

                accounts_document_id = await t.oneOrNone('SELECT document_id FROM accounts_clientuser WHERE iin = $1', [iin]);
                if(accounts_document_id['document_id'] != null){
                    user_document = await t.oneOrNone('SELECT * FROM accounts_document WHERE id = $1', [accounts_document_id['document_id']]);
                    docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [user_document['type_document_id']]);
                    user.docType = docType['name'];
                    user.docNumber = user_document['number'];
                    user.docDateIssued = user_document['date_issue'];
                    user.docIssuedBy = user_document['issued_by'];
                    user.docSeries = user_document['series']
                }

                const userId = user['id'];
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE id = $1', [cfmCode]);

                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE id = $1', [org_id]);
                const userRole = await t.many('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);
                org_address = await t.oneOrNone('SELECT * FROM accounts_organizationaddres WHERE organization_id = $1', [organization['id']]);
                if(org_address!=null){
                    org_country = await t.oneOrNone('SELECT * FROM directories_country WHERE id = $1', [org_address['country_id']]);
                    org_district = await t.oneOrNone('SELECT * FROM directories_district WHERE id = $1', [org_address['district_id']]);
                    org_region = await t.oneOrNone('SELECT * FROM directories_region WHERE id = $1', [org_address['region_id']]);
                    org_address.country = org_country;
                    org_address.district = org_district;
                    org_address.region = org_region;
                    delete org_address.region_id;
                    delete org_address.district_id;
                }


                const persons = await t.many('SELECT * FROM accounts_employee a INNER JOIN accounts_clientuser b on a.client_user_id = b.id WHERE a.organization_id = $1',[organization['id']]);

                organization.persons = persons;
                // Check if subjectCode is not null before accessing its properties
                if (subjectCode !== null && typeof subjectCode === 'object') {
                    organization.subjectCode = subjectCode['name'] ?? null;
                } else {
                    organization.subjectCode = null;
                }

                organization.orgType = orgType['type'];
                organization.address = org_address;

                const colors = {
                    reset: "\x1b[0m",
                    red: "\x1b[31m",
                    green: "\x1b[32m",
                    yellow: "\x1b[33m",
                    blue: "\x1b[34m",
                    magenta: "\x1b[35m",
                    cyan: "\x1b[36m",
                };

                function coloredLog(color, message) {
                    console.log(`${color}${message}${colors.reset}`);
                }

                user.userRole = userRole[0]['role'];
                const currentTime = new Date();

                coloredLog(colors.magenta, '-------------------------------------------------')
                coloredLog(colors.green,'User is logged in at: ' + currentTime.toISOString())
                coloredLog(colors.cyan,'User id: ' + user['first_name'])
                coloredLog(colors.cyan,'Users first name: ' + user['last_name'])
                coloredLog(colors.cyan,'Users last name: ' + user['id'])
                coloredLog(colors.cyan,'Users iin: ' + user['iin'])
                // Authentication successful

                coloredLog(colors.yellow, 'Organization information: ')
                coloredLog(colors.cyan, 'Organization id: ' + organization['id'])
                coloredLog(colors.cyan, 'Organization iin:: ' + organization['iin'])
                coloredLog(colors.cyan, 'Organization name: ' + organization['full_name'])
                coloredLog(colors.cyan, 'Organization type: ' + organization['orgType'])
                coloredLog(colors.cyan, 'Subject code: ' + organization['subjectCode'])

                res.json({
                    success: true,
                    message: 'Login successful',
                    user: user,
                    organization: organization,
                });
            } else {
                // Organization not found
                res.status(404).json({ success: false, message: 'Organization not found' });
            }
        } else {
            // Invalid credentials
            res.status(401).json({ success: false, message: 'Invalid iin or password' });
        }
    })
        .catch(error => {
            console.error('Error occurred while logging in:', error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        });
});

router.post('/token', function (req, res, next) {
    var iin = req.body.iin
    var refreshToken = req.body.refreshToken
    if((refreshToken in refreshTokens) && (refreshTokens[refreshToken] == username)) {
      var user = {
        'iin': iin,
      }
      var token = jwt.sign(user, 'chelovekpauk', { expiresIn: 300 })
      res.json({token: 'JWT ' + token})
    }
    else {
      res.send(401)
    }
  })

  router.post('/token/reject', function (req, res, next) { 
    var refreshToken = req.body.refreshToken 
    if(refreshToken in refreshTokens) { 
      delete refreshTokens[refreshToken]
    } 
    res.send(204) 
  })

module.exports = router;
