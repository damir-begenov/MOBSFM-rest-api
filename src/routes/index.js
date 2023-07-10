const express = require('express');
const router = express.Router();
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const pgp = require('pg-promise')();
require('dotenv').config();

const { DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
const connectionString = `postgres://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
const db = pgp(connectionString);

const sns = new SNSClient({ region: 'us-west-2' });

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

router.post('/verify-sms', async (req, res) => {
    const { phoneNumber } = req.body;

    try {
        // Generate a random verification code
        const verificationCode = generateVerificationCode();

        // Publish SMS message to SNS topic
        const command = new PublishCommand({
            Message: `Your verification code: ${verificationCode}`,
            PhoneNumber: phoneNumber
        });

        await sns.send(command);

        // Return success response
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({ error: 'Failed to send SMS' });
    }
});

// Helper function to generate a random verification code
function generateVerificationCode() {
    // Implement your code generation logic here
    return Math.floor(1000 + Math.random() * 9000);
}

module.exports = router;
