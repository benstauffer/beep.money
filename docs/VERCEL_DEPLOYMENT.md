# Deploying Your Next.js App with Teller Integration on Vercel

This guide walks you through the process of deploying your Next.js application with Teller integration to Vercel.

## Prerequisites

- A Vercel account
- Your Next.js project with Teller integration
- Teller PEM certificate files (certificate and private key)
- Node.js installed on your local machine

## Step 1: Prepare Your Next.js Application

1. Ensure your Next.js app builds locally without errors:

```bash
npm run build
```

2. Verify your `package.json` includes the required scripts:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

## Step 2: Encode Your Teller PEM Files

Since Vercel doesn't allow uploading files to its serverless environment, you need to convert your PEM files to base64-encoded strings to store them as environment variables:

1. Ensure your Teller certificate files are located in the correct directory (default: `./certs/teller/`).

2. Run the encoding script:

```bash
node scripts/encode-teller-certs.js
```

3. Copy the generated base64 strings from the terminal output for both:
   - `TELLER_CERTIFICATE_BASE64`
   - `TELLER_PRIVATE_KEY_BASE64`

## Step 3: Deploy to Vercel

1. Login to your Vercel account and create a new project.

2. Connect your GitHub/GitLab/Bitbucket repository or upload your project directly.

3. Configure your build settings:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. In the "Environment Variables" section, add all required environment variables:

   | Name | Value | Description |
   |------|-------|-------------|
   | `TELLER_CERTIFICATE_BASE64` | `<your-base64-cert>` | Your base64-encoded Teller certificate |
   | `TELLER_PRIVATE_KEY_BASE64` | `<your-base64-key>` | Your base64-encoded Teller private key |
   | `TELLER_API_URL` | `https://api.teller.io` | Teller API URL |
   | `NEXT_PUBLIC_TELLER_APPLICATION_ID` | `<your-app-id>` | Your Teller application ID |
   | ... | ... | (Add other environment variables your app needs) |

5. Click "Deploy" to deploy your application.

## Step 4: Verify Your Deployment

1. Once the deployment is complete, open your deployed application URL.

2. Test the Teller integration by connecting to a bank account.

3. Check the Vercel logs to ensure there are no certificate-related errors.

## Troubleshooting

If you encounter errors related to the Teller certificates:

1. Verify that your base64-encoded strings are correctly copied to Vercel environment variables.

2. Make sure the certificate and private key files are properly formatted PEM files before encoding.

3. Check that the code properly decodes the base64 strings when making requests to Teller API:

```javascript
// This should already be implemented in your src/lib/teller.ts
const cert = Buffer.from(process.env.TELLER_CERTIFICATE_BASE64, 'base64');
const key = Buffer.from(process.env.TELLER_PRIVATE_KEY_BASE64, 'base64');
```

4. If you're still having issues, check Vercel logs for error messages and ensure your API calls include the proper certificate authentication.

## Security Notes

- Never commit your PEM files or base64-encoded certificate strings to your repository.
- Use Vercel's environment variable encryption for added security.
- Consider using Vercel's integration with secret management solutions for production environments. 