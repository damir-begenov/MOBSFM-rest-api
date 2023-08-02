const fs = require('fs');

function requestLogger(req, res, next) {
    const { method, url, body, headers } = req;
    const logMessage = `
    Request Method: ${method}
    Request URL: ${url}
    Request Body: ${JSON.stringify(body)}
    Request Headers: ${JSON.stringify(headers)}
    ------------------------------
  `;

    // Change the file path to the desired location to store the logs
    const logFilePath = 'request_logs.txt';

    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing log:', err);
        }
    });

    next();
}

module.exports = requestLogger;
