const fs = require('fs');
const path = require('path');

// Path to your certificate files
// Update these paths to match your local certificate location
const CERT_PATH = process.env.TELLER_CERTIFICATE_PATH || './certificate.pem';
const KEY_PATH = process.env.TELLER_PRIVATE_KEY_PATH || './private_key.pem';

try {
  // Check if files exist
  if (!fs.existsSync(CERT_PATH)) {
    console.error(`Certificate file not found at: ${CERT_PATH}`);
    process.exit(1);
  }

  if (!fs.existsSync(KEY_PATH)) {
    console.error(`Private key file not found at: ${KEY_PATH}`);
    process.exit(1);
  }

  // Read files
  const cert = fs.readFileSync(CERT_PATH);
  const key = fs.readFileSync(KEY_PATH);

  // Convert to base64
  const certBase64 = cert.toString('base64');
  const keyBase64 = key.toString('base64');

  // Output
  console.log('\n--- TELLER_CERTIFICATE_BASE64 ---');
  console.log(certBase64);
  console.log('\n--- TELLER_PRIVATE_KEY_BASE64 ---');
  console.log(keyBase64);
  console.log('\n');

  console.log('Copy these values and add them to your Vercel environment variables.');
  console.log('Remember to keep them secure and never commit them to your repository!');

} catch (error) {
  console.error('Error encoding certificate files:', error);
  process.exit(1);
} 