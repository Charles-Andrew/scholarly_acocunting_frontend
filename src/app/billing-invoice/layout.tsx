import { AppLayout } from "@/components/layout/app-layout"

export default function BillingInvoiceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppLayout showThemeToggle>{children}</AppLayout>
}
