import { AppLayout } from "@/components/layout/app-layout"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout showThemeToggle>{children}</AppLayout>
}
