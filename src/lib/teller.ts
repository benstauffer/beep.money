import axios from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';

const TELLER_API_URL = process.env.TELLER_API_URL || 'https://api.teller.io';

// Create an HTTPS agent with the certificate and private key for authentication
const createHttpsAgent = () => {
  try {
    let cert: Buffer | undefined;
    let key: Buffer | undefined;

    // First try to get certificates from environment variables
    const certBase64 = process.env.TELLER_CERTIFICATE_BASE64;
    const keyBase64 = process.env.TELLER_PRIVATE_KEY_BASE64;

    if (certBase64 && keyBase64) {
      // If we have base64 encoded certs in env vars, decode them
      cert = Buffer.from(certBase64, 'base64');
      key = Buffer.from(keyBase64, 'base64');
      console.log('Using certificates from environment variables');
    } else {
      // Fall back to file-based certificates
      const certPath = process.env.TELLER_CERTIFICATE_PATH;
      const keyPath = process.env.TELLER_PRIVATE_KEY_PATH;
      
      // Check for alternative names if the configured ones don't exist
      if (certPath && !fs.existsSync(path.resolve(certPath))) {
        const altCertPath = './certificate.pem';
        if (fs.existsSync(path.resolve(altCertPath))) {
          console.log('Using alternative certificate path:', altCertPath);
          cert = fs.readFileSync(path.resolve(altCertPath));
        }
      } else if (certPath) {
        cert = fs.readFileSync(path.resolve(certPath));
      }
      
      if (keyPath && !fs.existsSync(path.resolve(keyPath))) {
        const altKeyPath = './private_key.pem';
        if (fs.existsSync(path.resolve(altKeyPath))) {
          console.log('Using alternative private key path:', altKeyPath);
          key = fs.readFileSync(path.resolve(altKeyPath));
        }
      } else if (keyPath) {
        key = fs.readFileSync(path.resolve(keyPath));
      }
    }

    if (!cert || !key) {
      console.warn('Teller certificate or private key not found');
      return undefined;
    }

    return new https.Agent({
      cert,
      key,
      rejectUnauthorized: true
    });
  } catch (error) {
    console.error('Error creating HTTPS agent for Teller API:', error);
    return undefined;
  }
};

// Create an axios instance for the Teller API
const tellerApi = axios.create({
  baseURL: TELLER_API_URL,
  httpsAgent: createHttpsAgent(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set the authorization header for each request
tellerApi.interceptors.request.use((config) => {
  if (config.headers) {
    // For enrollment-specific API requests
    const token = config.headers['X-Teller-Token'];
    if (token) {
      // Use HTTP Basic Auth with the access token
      // The token is the username, password is empty
      config.auth = {
        username: token,
        password: ''
      };
      
      // Remove the custom header
      delete config.headers['X-Teller-Token'];
    }
  }
  return config;
});

export interface TellerAccount {
  id: string;
  enrollment_id: string;
  institution: {
    name: string;
  };
  last_four: string;
  links: {
    self: string;
    transactions: string;
    details: string;
  };
  name: string;
  subtype: string;
  type: string;
  status: string;
  currency: string;
  balance?: {
    available?: number;
    current?: number;
    ledger?: number;
  };
}

export interface TellerTransaction {
  id: string;
  account_id: string;
  date: string;
  description: string;
  details: {
    processing_status: string;
    category: string;
  };
  amount: number;
  running_balance: number;
  status: string;
  type: string;
}

// Get all accounts for an enrollment
export async function getAccounts(accessToken: string): Promise<TellerAccount[]> {
  try {
    console.log('Making request to Teller API to get accounts');
    console.log('Teller API request to /accounts with token');
    
    const response = await tellerApi.get('/accounts', {
      headers: {
        'X-Teller-Token': accessToken,
      },
    });
    
    console.log('Teller API response success, accounts:', response.data.length);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching Teller accounts:', error);
    
    // Add more detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Teller API');
    }
    
    throw error;
  }
}

// Get transactions for an account
export async function getTransactions(
  accessToken: string,
  accountId: string,
  options: {
    from?: string; // YYYY-MM-DD format
    to?: string; // YYYY-MM-DD format
    count?: number;
  } = {}
): Promise<TellerTransaction[]> {
  try {
    const { from, to, count } = options;
    const params = new URLSearchParams();
    
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (count) params.append('count', count.toString());
    
    const response = await tellerApi.get(`/accounts/${accountId}/transactions?${params.toString()}`, {
      headers: {
        'X-Teller-Token': accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Teller transactions:', error);
    throw error;
  }
}

// Get account balance
export async function getAccountBalance(
  accessToken: string,
  accountId: string
): Promise<TellerAccount['balance']> {
  try {
    const response = await tellerApi.get(`/accounts/${accountId}/balances`, {
      headers: {
        'X-Teller-Token': accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Teller account balance:', error);
    throw error;
  }
}

// Get account details
export async function getAccountDetails(
  accessToken: string,
  accountId: string
): Promise<any> {
  try {
    const response = await tellerApi.get(`/accounts/${accountId}/details`, {
      headers: {
        'X-Teller-Token': accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Teller account details:', error);
    throw error;
  }
} 