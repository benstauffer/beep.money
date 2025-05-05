"use client"

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib';

interface SpendingSummary {
  dailySpend: string;
  weeklySpend: string;
  monthlySpend: string;
}

export default function SpendingSummary() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendingData, setSpendingData] = useState<SpendingSummary>({
    dailySpend: '$0.00',
    weeklySpend: '$0.00',
    monthlySpend: '$0.00'
  });

  useEffect(() => {
    async function fetchSpendingData() {
      try {
        setLoading(true);
        const response = await fetch('/api/transactions/summary');
        if (!response.ok) {
          throw new Error('Failed to fetch spending data');
        }
        const data = await response.json();
        setSpendingData(data);
      } catch (err) {
        console.error('Error fetching spending data:', err);
        setError('Failed to load spending data');
      } finally {
        setLoading(false);
      }
    }

    fetchSpendingData();
  }, []);

  if (error) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="yesterday" className="w-full">
        <TabsList className="grid grid-cols-4 gap-4">
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          <TabsTrigger value="last7Days">Last 7 days</TabsTrigger>
          <TabsTrigger value="last30Days">Last 30 days</TabsTrigger>
          <TabsTrigger value="thisMonth">This month</TabsTrigger>
        </TabsList>

        <TabsContent value="yesterday" className="mt-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? 'Loading...' : spendingData.dailySpend}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Total spent yesterday</p>
          </div>
        </TabsContent>

        <TabsContent value="last7Days" className="mt-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? 'Loading...' : spendingData.weeklySpend}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Total spent in the last 7 days</p>
          </div>
        </TabsContent>

        <TabsContent value="last30Days" className="mt-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? 'Loading...' : spendingData.monthlySpend}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Total spent in the last 30 days</p>
          </div>
        </TabsContent>

        <TabsContent value="thisMonth" className="mt-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? 'Loading...' : spendingData.monthlySpend}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">Total spent this month</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 