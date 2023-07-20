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
        const assessments = await t.manyOrNone(`SELECT * FROM assessments_assessment 
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
         assessment_activity[0]['category_code']  = 'Активность';
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
         assessment_obedience[0]['category_code']  = 'Законопослушность';
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
         assessment_main_info[0]['category_code']  = 'Общие данные';
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
         assessment_regulator_documents[0]['category_code']  = 'Регламентирующие документы';
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
       assessment_fin[0]['category_code'] = 'Операции фин.мониторинга';
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
          assessment_qualification_sum[0]['category_code'] = 'Квалификация';
          const all_points = await t.manyOrNone(`SELECT
          SUM(assessments_assessmentitem.point) AS total_points
        FROM assessments_assessment
        INNER JOIN assessments_assessmentitem ON assessments_assessment.id = assessments_assessmentitem.assessment_id
        INNER JOIN assessments_assessmentitemcode ON assessments_assessmentitemcode.id = assessments_assessmentitem.code_id
        INNER JOIN assessments_assessmentitemcategory ON assessments_assessmentitemcategory.id = assessments_assessmentitemcode.category_id
        WHERE assessments_assessment.date >= date_trunc('month', current_date) + INTERVAL '1 day'
          AND assessments_assessment.date < (date_trunc('month', current_date) + INTERVAL '1 month' - INTERVAL '1 day')
          AND assessments_assessment.organization_id = $1 ;`, [organization_id]);
          //   const all_points = assessment_qualification_sum[0]['total_points'] + assessment_fin[0]['total_points'] + assessment_regulator_documents[0]['total_points'] + assessment_main_info[0]['total_points'];
        res.json({
            assessments: assessments,
            assessment_activity_sum: assessment_activity,
            assessment_obedience_sum: assessment_obedience,
            assessment_main_info_sum: assessment_main_info,
            assessment_regulator_documents_sum: assessment_regulator_documents,
            assessment_fin_sum: assessment_fin,
            assessment_qualification_sum: assessment_qualification_sum,
            total_points: all_points
        })
    });
});



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
    const {name} = req.body;
    db.task(async t => {
        const sanctions_sanctionother = await t.manyOrNone('SELECT * from sanctions_sanctionother a INNER JOIN sanctions_sanctionothercategory b ON a.category_id = b.id where b.name = $1', [name])
        sanctions_sanctionother.document_count = await t.oneOrNone('SELECT COUNT(DISTINCT(status)) FROM sanctions_sanctionother a INNER JOIN sanctions_sanctionothercategory b ON a.category_id = b.id where b.name = $1',[name])
        res.json({
            sanctions_sanctionother: sanctions_sanctionother
        })
    }).catch(error => {
        res.status(500).json({ success: false, message: 'Internal server error', error: error});
    });
});

router.post('/checkCountOrg', (req, res) => {
    const {iin} = req.body;
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM accounts_clientuser WHERE iin = $1', [iin]);
        if (user) {

            const organization = await t.many('SELECT a.id, a.iin, a.organization_registration_date, a.registration_date, a.full_name, a.full_name_ru, a.full_name_kk, a.full_name_kaz, a.short_name, a.short_name_ru, a.short_name_kk, a.short_name_kaz, a.oked, a."type", a.blocking, a.reason_blocking, a.form_of_law_id, a.org_form_id, a.org_size_id, a.aifc_member, a."blocked", a.document_unique_identifier, a.is_fm1, a.is_afm_employee, a.is_afm_supervisor, a.p12_sign, a.status, b.code, b."name", b.name_ru, b.name_kk, b.name_kaz, b.count FROM accounts_organization a inner join directories_codetype b on  a.subject_code_id = b.id WHERE a.id in (SELECT organization_id FROM accounts_employee WHERE client_user_id = $1)',[user['id']]);
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
                organization.subjectCode = subjectCode['name'];
                organization.orgType = orgType['type'];
                organization.address = org_address;

                user.userRole = userRole[0]['role'];

                console.log(user)
                console.log(organization)
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
                expiresIn: "2h",
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
                organization.subjectCode = subjectCode['name'];
                organization.orgType = orgType['type'];
                organization.address = org_address;

                user.userRole = userRole[0]['role'];

                console.log(user)
                console.log(organization)
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
