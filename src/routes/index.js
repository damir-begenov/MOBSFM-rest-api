const express = require('express');
const router = express.Router();
const pgp = require('pg-promise')();
const xml2js = require('xml2js');
const Organization = require('../classes/organization.js');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const {auth} = require("firebase-admin");
var randtoken = require('rand-token') 

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const connectionString = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const db = pgp(connectionString);

router.use(express.json());

router.get('/api', (req, res) => {
    res.status(200).send({
        success: true,
    });
});

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




router.post('/checkSession', (req, res) => {
    const {iin} = req.body;
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
            const organization = await t.oneOrNone('SELECT * FROM accounts_organization WHERE iin = $1', [iin]);

            if (organization) {
                const xmlData = organization.xml_to_sign;
                const organization_instance = new Organization(xmlData);
                await organization_instance.parseXml();

                const parser = new xml2js.Parser();
                const parsedData = await parser.parseStringPromise(xmlData);
                const organisationData = parsedData.Data.Root[0].OrganisationData[0];

                const cfmCode = organisationData.CfmCode[0]['_'];

                const accounts_document_id = await t.oneOrNone('SELECT document_id FROM accounts_clientuser WHERE iin = $1', [iin]);
                const user_document = await t.oneOrNone('SELECT * FROM accounts_document WHERE id = $1', [accounts_document_id['document_id']]);
                const userId = user.user_id;
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE code = $1', [cfmCode]);
                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE iin = $1', [iin]);
                const docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [user_document['type_document_id']]) || null;
                const userRole = await t.oneOrNone('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);
                const org_address = await t.oneOrNone('SELECT * FROM accounts_organizationaddres WHERE organization_id = $1', [organization['id']]);
                const org_country = await t.oneOrNone('SELECT * FROM directories_country WHERE id = $1', [org_address['country_id']]);
                const org_district = await t.oneOrNone('SELECT * FROM directories_district WHERE id = $1', [org_address['district_id']]);
                const org_region = await t.oneOrNone('SELECT * FROM directories_region WHERE id = $1', [org_address['region_id']]);

                const persons = await t.many('SELECT * FROM accounts_employee a INNER JOIN accounts_clientuser b on a.client_user_id = b.id WHERE a.organization_id = $1',[organization['id']]);

                organization_instance.persons = persons;
                organization_instance.subjectCode = subjectCode['name'];
                organization_instance.orgType = orgType['type'];
                org_address.country = org_country;
                org_address.district = org_district;
                org_address.region = org_region;
                delete org_address.region_id;
                delete org_address.district_id;
                organization_instance.address = org_address;

                user.docType = docType['name'];
                user.docNumber = user_document['number'];
                user.docDateIssued = user_document['date_issue'];
                user.docIssuedBy = user_document['issued_by'];
                user.docSeries = user_document['series']
                user.userRole = userRole['role'];

                console.log(user);
                console.log(organization);
                // Authentication successful
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: user,
                    organization_xml: organization_instance,
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
    const { iin, password } = req.body;
    console.log(req.body)
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
        console.log(user)
        if (user && user.id === password) {
            const organization = await t.oneOrNone('SELECT * FROM accounts_organization WHERE iin = $1', [iin]);
            console.log(organization)
            if (organization) {



                const cfmCode = organization['subject_code_id'];
                let docType = null;
                let user_document = null;
                let accounts_document_id = null;

                accounts_document_id = await t.oneOrNone('SELECT document_id FROM accounts_clientuser WHERE iin = $1', [iin]) || null;
                if(accounts_document_id != null){
                    user_document = await t.oneOrNone('SELECT * FROM accounts_document WHERE id = $1', [accounts_document_id['document_id']]);
                    docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [user_document['type_document_id']]) || null;
                }

                const userId = user.user_id;
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE code = $1', [cfmCode]);
                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE iin = $1', [iin]);
                const userRole = await t.oneOrNone('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);
                const org_address = await t.oneOrNone('SELECT * FROM accounts_organizationaddres WHERE organization_id = $1', [organization['id']]);
                const org_country = await t.oneOrNone('SELECT * FROM directories_country WHERE id = $1', [org_address['country_id']]);
                const org_district = await t.oneOrNone('SELECT * FROM directories_district WHERE id = $1', [org_address['district_id']]);
                const org_region = await t.oneOrNone('SELECT * FROM directories_region WHERE id = $1', [org_address['region_id']]);

                const persons = await t.many('SELECT * FROM accounts_employee a INNER JOIN accounts_clientuser b on a.client_user_id = b.id WHERE a.organization_id = $1',[organization['id']]);

                organization.persons = persons;
                organization.subjectCode = subjectCode['name'];
                organization.orgType = orgType['type'];
                org_address.country = org_country;
                org_address.district = org_district;
                org_address.region = org_region;
                delete org_address.region_id;
                delete org_address.district_id;
                organization.address = org_address;

                user.docType = docType['name'];
                user.docNumber = user_document['number'];
                user.docDateIssued = user_document['date_issue'];
                user.docIssuedBy = user_document['issued_by'];
                user.docSeries = user_document['series']
                user.userRole = userRole['role'];

                console.log(user);
                console.log(organization);
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
