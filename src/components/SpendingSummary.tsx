"use client"

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Dummy data for now - this would be fetched from your API that connects to Teller
const DUMMY_DATA = {
  yesterday: {
    totalSpent: 42.75,
    topCategories: [
      { name: 'Food & Dining', amount: 28.50 },
      { name: 'Transportation', amount: 14.25 },
    ],
    transactions: [
      { id: '1', date: '2023-05-03', description: 'Coffee Shop', amount: 5.25, category: 'Food & Dining' },
      { id: '2', date: '2023-05-03', description: 'Lunch', amount: 12.50, category: 'Food & Dining' },
      { id: '3', date: '2023-05-03', description: 'Uber', amount: 14.25, category: 'Transportation' },
      { id: '4', date: '2023-05-03', description: 'Dinner', amount: 10.75, category: 'Food & Dining' },
    ]
  },
  last7Days: {
    totalSpent: 312.40,
    topCategories: [
      { name: 'Food & Dining', amount: 145.20 },
      { name: 'Entertainment', amount: 65.90 },
      { name: 'Shopping', amount: 58.30 },
      { name: 'Transportation', amount: 43.00 },
    ],
    transactions: [
      { id: '5', date: '2023-05-02', description: 'Grocery Store', amount: 67.80, category: 'Food & Dining' },
      { id: '6', date: '2023-05-01', description: 'Movie Tickets', amount: 32.50, category: 'Entertainment' },
      { id: '7', date: '2023-04-30', description: 'Amazon', amount: 58.30, category: 'Shopping' },
      { id: '8', date: '2023-04-29', description: 'Restaurant', amount: 45.60, category: 'Food & Dining' },
    ]
  },
  last30Days: {
    totalSpent: 1245.90,
    topCategories: [
      { name: 'Food & Dining', amount: 358.40 },
      { name: 'Housing', amount: 450.00 },
      { name: 'Entertainment', amount: 187.50 },
      { name: 'Shopping', amount: 142.30 },
      { name: 'Transportation', amount: 107.70 },
    ],
    transactions: [
      { id: '9', date: '2023-04-25', description: 'Rent', amount: 450.00, category: 'Housing' },
      { id: '10', date: '2023-04-20', description: 'Concert Tickets', amount: 95.00, category: 'Entertainment' },
      { id: '11', date: '2023-04-15', description: 'Grocery Store', amount: 89.30, category: 'Food & Dining' },
      { id: '12', date: '2023-04-10', description: 'Gas Station', amount: 45.80, category: 'Transportation' },
    ]
  },
  thisWeek: {
    totalSpent: 187.65,
    topCategories: [
      { name: 'Food & Dining', amount: 87.25 },
      { name: 'Transportation', amount: 55.40 },
      { name: 'Entertainment', amount: 45.00 },
    ],
    transactions: [
      { id: '13', date: '2023-05-03', description: 'Restaurant', amount: 32.75, category: 'Food & Dining' },
      { id: '14', date: '2023-05-02', description: 'Uber', amount: 28.90, category: 'Transportation' },
      { id: '15', date: '2023-05-01', description: 'Movie Tickets', amount: 45.00, category: 'Entertainment' },
      { id: '16', date: '2023-05-01', description: 'Lunch', amount: 15.50, category: 'Food & Dining' },
    ]
  },
  thisMonth: {
    totalSpent: 625.80,
    topCategories: [
      { name: 'Food & Dining', amount: 210.45 },
      { name: 'Housing', amount: 150.00 },
      { name: 'Entertainment', amount: 95.70 },
      { name: 'Shopping', amount: 85.25 },
      { name: 'Transportation', amount: 84.40 },
    ],
    transactions: [
      { id: '17', date: '2023-05-01', description: 'Utility Bill', amount: 150.00, category: 'Housing' },
      { id: '18', date: '2023-05-02', description: 'Department Store', amount: 85.25, category: 'Shopping' },
      { id: '19', date: '2023-05-02', description: 'Grocery Store', amount: 75.90, category: 'Food & Dining' },
      { id: '20', date: '2023-05-03', description: 'Concert Tickets', amount: 95.70, category: 'Entertainment' },
    ]
  }
};

export default function SpendingSummary() {
  const [period, setPeriod] = useState('last7Days');
  const data = DUMMY_DATA[period as keyof typeof DUMMY_DATA];
  
  // Format amount as currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Format date nicely
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="last7Days" onValueChange={setPeriod}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          <TabsTrigger value="last7Days">Last 7 Days</TabsTrigger>
          <TabsTrigger value="last30Days">Last 30 Days</TabsTrigger>
          <TabsTrigger value="thisWeek">This Week</TabsTrigger>
          <TabsTrigger value="thisMonth">This Month</TabsTrigger>
        </TabsList>
        
        {Object.keys(DUMMY_DATA).map((key) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Total Spent: {formatCurrency(DUMMY_DATA[key as keyof typeof DUMMY_DATA].totalSpent)}
              </h3>
              
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">Top Categories</h4>
                <div className="space-y-2">
                  {DUMMY_DATA[key as keyof typeof DUMMY_DATA].topCategories.map((category, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">{category.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(category.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Recent Transactions</h4>
              <div className="space-y-3">
                {DUMMY_DATA[key as keyof typeof DUMMY_DATA].transactions.map((transaction) => (
                  <div key={transaction.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                      <div className="flex space-x-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{formatDate(transaction.date)}</span>
                        <span className="text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-gray-500 dark:text-gray-400">{transaction.category}</span>
                      </div>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(transaction.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
} 