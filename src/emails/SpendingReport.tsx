import * as React from 'react';
import { Html } from '@react-email/html';
import { Text } from '@react-email/text';
import { Section } from '@react-email/section';
import { Container } from '@react-email/container';
import { Link } from '@react-email/link';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface SpendingReportEmailProps {
  firstName: string;
  dailySpend: string;
  weeklySpend: string;
  monthlySpend: string;
  thisWeekSpend: string;
  thisMonthSpend: string;
  period: string;
}

export function SpendingReportEmail(data: SpendingReportEmailProps) {
  return (
    <Html>
      <Section style={main}>
        <Container style={container}>
          <Text style={paragraph}>Hi {data.firstName},</Text>
          
          <Text style={paragraph}>Here's a summary of your spending:</Text>
          
          <Text style={spendingItem}>Yesterday: {data.dailySpend}</Text>
          <Text style={spendingItem}>Last 7 days: {data.weeklySpend}</Text>
          <Text style={spendingItem}>Last 30 days: {data.monthlySpend}</Text>
          <Text style={spendingItem}>This week: {data.thisWeekSpend}</Text>
          <Text style={spendingItem}>This month: {data.thisMonthSpend}</Text>

          <Text style={paragraph}>
            <Link href="https://beep.money" style={button}>
              View Your Account →
            </Link>
          </Text>
        </Container>
      </Section>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '580px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '24px',
};

const spendingItem = {
  fontSize: '16px',
  lineHeight: '24px',
  margin: '12px 0',
  paddingLeft: '12px',
  borderLeft: '3px solid #f0f0f0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}; 