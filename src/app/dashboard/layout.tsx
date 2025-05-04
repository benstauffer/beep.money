import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - beep.money',
  description: 'Manage your connected accounts and view spending insights',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 