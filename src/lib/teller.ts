import axios from 'axios';
import fs from 'fs';
import path from 'path';
import https from 'https';

const TELLER_API_URL = process.env.TELLER_API_URL || 'https://api.teller.io';

// Create an HTTPS agent with the certificate and private key for authentication
const createHttpsAgent = () => {
  try {
    const certPath = process.env.TELLER_CERTIFICATE_PATH;
    const keyPath = process.env.TELLER_PRIVATE_KEY_PATH;
    
    if (!certPath || !keyPath) {
      console.warn('Teller certificate or private key path not provided');
      return undefined;
    }
    
    // Check if files exist before reading
    if (!fs.existsSync(path.resolve(certPath)) || !fs.existsSync(path.resolve(keyPath))) {
      console.warn(`Teller certificate or private key file not found, using default HTTPS agent`);
      return undefined;
    }
    
    return new https.Agent({
      cert: fs.readFileSync(path.resolve(certPath)),
      key: fs.readFileSync(path.resolve(keyPath)),
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
    // For application API requests
    // Check if auth property is present and explicitly set to false
    // @ts-ignore - Custom property for our implementation
    if (config.skipAuth === true) {
      return config;
    }
    
    // For enrollment-specific API requests
    const token = config.headers['X-Teller-Token'];
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
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
    const response = await tellerApi.get('/accounts', {
      headers: {
        'X-Teller-Token': accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Teller accounts:', error);
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