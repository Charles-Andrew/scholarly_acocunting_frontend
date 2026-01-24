import { AppLayout } from "@/components/layout/app-layout"

export default function LogsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout showThemeToggle>{children}</AppLayout>
}
