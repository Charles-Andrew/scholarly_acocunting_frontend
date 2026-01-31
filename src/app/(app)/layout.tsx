import { AppLayout } from "@/components/layout/app-layout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Scholarly Accounting",
  description: "Financial management and accounting application",
}

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout showThemeToggle>{children}</AppLayout>
}
