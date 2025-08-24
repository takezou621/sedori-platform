import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Admin Dashboard - 管理ダッシュボード | Sedori Platform",
  description: "Administrative dashboard for managing users, products, orders, and platform analytics",
  keywords: "admin, dashboard, management, 管理, ダッシュボード, administration",
  openGraph: {
    title: "Admin Dashboard - 管理ダッシュボード | Sedori Platform",
    description: "Administrative dashboard for managing users, products, orders, and platform analytics",
  },
  robots: {
    index: false, // Don't index admin pages
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}