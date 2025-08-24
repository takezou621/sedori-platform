import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Beta User Management - ベータユーザー管理 | Admin Dashboard",
  description: "Administrative interface for managing beta test participants and invitations",
  keywords: "admin, beta, management, 管理, ベータユーザー, beta users, administration",
  openGraph: {
    title: "Beta User Management - ベータユーザー管理 | Admin Dashboard",
    description: "Administrative interface for managing beta test participants and invitations",
  },
  robots: {
    index: false, // Don't index admin pages
    follow: false,
  },
};

export default function AdminBetaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}