const https = require('https');

/**
 * Sends a password-reset email via Brevo REST API v3.
 *
 * @param {string} to         Recipient email address
 * @param {string} resetUrl   Full reset URL (includes raw token as query param)
 */
async function sendPasswordResetEmail(to, resetUrl) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not set in environment variables');
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'chakshitajaswal2106@gmail.com';

  const textContent = [
    'Hi,',
    '',
    'We received a request to reset the password for your MARKD account.',
    'Click the link below to set a new password. This link expires in 1 hour.',
    '',
    resetUrl,
    '',
    'If you did not request a password reset, please ignore this email.',
    'Your password will not change unless you click the link above.',
    '',
    '— The MARKD team',
  ].join('\n');

  const payload = JSON.stringify({
    sender: { name: 'MARKD', email: senderEmail },
    to: [{ email: to }],
    subject: 'Reset your MARKD password',
    textContent,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': apiKey,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(responseBody));
            } catch (err) {
              resolve({ status: res.statusCode });
            }
          } else {
            reject(new Error(`Brevo API error (${res.statusCode}): ${responseBody}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(new Error(`Brevo request failed: ${err.message}`));
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendPasswordResetEmail };
