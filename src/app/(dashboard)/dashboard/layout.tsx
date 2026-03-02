import { SentryErrorBoundary } from "@/components/providers/SentryErrorBoundary";

type DashboardLayoutProps = {
  children: React.ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <SentryErrorBoundary boundaryName="dashboard-layout">{children}</SentryErrorBoundary>;
}
