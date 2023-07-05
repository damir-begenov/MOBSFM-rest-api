const express = require('express');
const router = express.Router();
const pgp = require('pg-promise')();
require('dotenv').config();

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const connectionString = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const db = pgp(connectionString);

router.use(express.json());

router.get('/api', (req, res) => {
    res.status(200).send({
        success: true,
    });
});

router.post('/login', (req, res) => {
    const { iin, password } = req.body;
    console.log(req.body)
    // Query the database to validate the user's credentials and fetch additional data
    db.task(async t => {
        const user = await t.oneOrNone('SELECT * FROM users WHERE "iin" = $1', [iin]);
        console.log(user)

        if (user && user.user_password === password) {
            console.log(user.org_id)
            const organization = await t.oneOrNone('SELECT * FROM organization WHERE id = $1', [user.org_id]);
            console.log(organization)
            if (organization) {
                const subjectCode = await t.oneOrNone('SELECT * FROM subject_codes WHERE id = $1', [organization.code_id]);
                const orgType = await t.oneOrNone('SELECT * FROM org_types WHERE id = $1', [organization.org_type_id]);

                // Authentication successful
                res.json({
                    success: true,
                    message: 'Login successful',
                    user: user,
                    organization: organization,
                    subjectCode: subjectCode,
                    orgType: orgType
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

module.exports = router;
