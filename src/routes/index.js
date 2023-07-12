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

router.post('/checkSession', (req, res) => {
    const {iin} = req.body;
    console.log(iin);
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM accounts_clientuser WHERE iin = $1', [iin]);
        console.log(user)
        if (user && user.id === password) {
            const token = jwt.sign(
                { user_id: user._id, email },
                'chelovekpauk',
                {
                  expiresIn: "2h",
                }
              );
              // save user token
              user.token = token;
              print('fe');
            const organization = await t.oneOrNone('SELECT * FROM accounts_organization WHERE iin = $1', [iin]);
            console.log(organization)
            if (organization) {
                const xmlData = organization.xml_to_sign;
                const organization_instance = new Organization(xmlData);
                await organization_instance.parseXml();

                const parser = new xml2js.Parser();
                const parsedData = await parser.parseStringPromise(xmlData);
                const organisationData = parsedData.Data.Root[0].OrganisationData[0];
                const additionalAcData = organisationData.AdditionalAcData[0];

                const cfmCode = organisationData.CfmCode[0]['_'];
                const docId = additionalAcData.DocumentIdentity[0]['_'];
                const userId = user.user_id;
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE code = $1', [cfmCode]);
                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE iin = $1', [iin]);
                const docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [docId]);
                const userRole = await t.oneOrNone('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);

                organization_instance.subjectCode = subjectCode['name'];
                organization_instance.orgType = orgType['type'];
                organization_instance.org_docType = docType['name'];
                user.userRole = userRole['role'];
                print('felll');

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
                const xmlData = organization.xml_to_sign;
                const organization_instance = new Organization(xmlData);
                await organization_instance.parseXml();

                const parser = new xml2js.Parser();
                const parsedData = await parser.parseStringPromise(xmlData);
                const organisationData = parsedData.Data.Root[0].OrganisationData[0];
                const additionalAcData = organisationData.AdditionalAcData[0];

                const cfmCode = organisationData.CfmCode[0]['_'];
                const docId = additionalAcData.DocumentIdentity[0]['_'];
                const userId = user.user_id;
                const subjectCode = await t.oneOrNone('SELECT name FROM directories_codetype WHERE code = $1', [cfmCode]);
                const orgType = await t.oneOrNone('SELECT type FROM accounts_organization WHERE iin = $1', [iin]);
                const docType = await t.oneOrNone('SELECT name FROM accounts_typedocument WHERE id = $1', [docId]);
                const userRole = await t.oneOrNone('SELECT role FROM accounts_employee WHERE client_user_id = $1', [userId]);

                organization_instance.subjectCode = subjectCode['name'];
                organization_instance.orgType = orgType['type'];
                organization_instance.org_docType = docType['name'];
                user.userRole = userRole['role'];

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
