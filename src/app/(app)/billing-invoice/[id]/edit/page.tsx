import { BillingInvoiceForm } from "@/components/billing/billing-invoice-form"

interface EditBillingInvoicePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditBillingInvoicePage({ params }: EditBillingInvoicePageProps) {
  const { id } = await params
  return <BillingInvoiceForm invoiceId={id} />
}
