/**
 * Recent Invoice type for dashboard
 */
export type RecentInvoice = {
  id: string
  invoice_number: string
  date: string
  amount_due: number | string
  status: string
  grand_total: number | string
  signed: boolean
  clients?: { name?: string } | null
}

/**
 * Revenue by category data
 */
export type RevenueByCategory = {
  name: string
  value: number
  count: number
}

/**
 * Category with invoices for revenue calculation
 */
export type CategoryWithInvoices = {
  name: string
  billing_invoices: {
    status: string
    grand_total: string | number
  }[] | null
}

/**
 * Invoice reference for revenue calculations
 */
export type RevenueInvoiceRef = {
  status: string
  grand_total: string | number
}
