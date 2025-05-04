import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
  Img,
  Row,
  Column,
} from '@react-email/components';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface SpendingReportEmailProps {
  firstName: string;
  transactions: Transaction[];
  totalSpent: number;
  period: string;
  topCategories: { name: string; amount: number }[];
}

export const SpendingReportEmail: React.FC<Partial<SpendingReportEmailProps>> = ({
  firstName = 'User',
  transactions = [],
  totalSpent = 0,
  period = 'this week',
  topCategories = [],
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={header}>Your Spending Report</Heading>
          
          <Text style={paragraph}>
            Hi {firstName},
          </Text>
          
          <Text style={paragraph}>
            Here's a summary of your spending {period}. You spent a total of{' '}
            <strong>{formatCurrency(totalSpent)}</strong>.
          </Text>
          
          {topCategories.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={subheader}>
                Top Spending Categories
              </Heading>
              
              {topCategories.map((category, i) => (
                <Row key={i} style={categoryRow}>
                  <Column style={categoryNameColumn}>
                    <Text style={categoryName}>{category.name}</Text>
                  </Column>
                  <Column style={categoryAmountColumn}>
                    <Text style={categoryAmount}>{formatCurrency(category.amount)}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}
          
          {transactions.length > 0 && (
            <Section style={section}>
              <Heading as="h2" style={subheader}>
                Recent Transactions
              </Heading>
              
              {transactions.map((transaction) => (
                <Row key={transaction.id} style={transactionRow}>
                  <Column style={{ width: '30%' }}>
                    <Text style={transactionDate}>
                      {formatDate(transaction.date)}
                    </Text>
                  </Column>
                  <Column style={{ width: '50%' }}>
                    <Text style={transactionDescription}>
                      {transaction.description}
                    </Text>
                    {transaction.category && (
                      <Text style={transactionCategory}>
                        {transaction.category}
                      </Text>
                    )}
                  </Column>
                  <Column style={{ width: '20%', textAlign: 'right' }}>
                    <Text style={transactionAmount}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>
          )}
          
          <Text style={paragraph}>
            Want more insights? Connect more accounts in your dashboard to get a more complete view of your finances.
          </Text>
          
          <Text style={footer}>
            © {new Date().getFullYear()} Beep Money. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default SpendingReportEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '600px',
};

const header = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
};

const subheader = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '25px 0 15px',
};

const paragraph = {
  color: '#444',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const section = {
  margin: '30px 0',
};

const categoryRow = {
  borderBottom: '1px solid #f0f0f0',
  padding: '8px 0',
};

const categoryNameColumn = {
  width: '70%',
};

const categoryAmountColumn = {
  width: '30%',
  textAlign: 'right' as const,
};

const categoryName = {
  fontSize: '16px',
  color: '#444',
  margin: '4px 0',
};

const categoryAmount = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '4px 0',
};

const transactionRow = {
  padding: '12px 0',
  borderBottom: '1px solid #f0f0f0',
};

const transactionDate = {
  color: '#666',
  fontSize: '14px',
  margin: '4px 0',
};

const transactionDescription = {
  color: '#333',
  fontSize: '16px',
  margin: '4px 0',
};

const transactionCategory = {
  color: '#777',
  fontSize: '14px',
  margin: '2px 0',
};

const transactionAmount = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '4px 0',
};

const footer = {
  color: '#999',
  fontSize: '14px',
  margin: '40px 0 0',
  textAlign: 'center' as const,
}; 