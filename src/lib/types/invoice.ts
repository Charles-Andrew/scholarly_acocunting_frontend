/**
 * Line item for billing invoices
 */
export type LineItem = {
  id: string
  description: string
  amount: number
}

/**
 * Billing Invoice type definition
 */
export type Invoice = {
  id: string
  invoice_number: string
  client_id: string | null
  income_category_id: string | null
  date: string
  due_date: string
  status: "draft" | "for_approval" | "approved"
  grand_total: number
  discount: number
  amount_due: number
  bank_account_id: string | null
  prepared_by: string | null
  approved_by: string | null
  created_at: string | null
  updated_at: string | null
  sent_to_client_at: string | null
  // Joined data
  prepared_by_signature?: { signature_image: string; signed_at: string } | null
  approved_by_signature?: { signature_image: string; signed_at: string } | null
  client_name?: string
  income_category_name?: string
  prepared_by_name?: string
  has_journal_entry?: boolean
}

/**
 * User type for billing invoice forms
 */
export type BillingInvoiceUser = {
  id: string
  email: string
  full_name?: string
  position?: string
}

/**
 * Income Category type definition
 */
export type IncomeCategory = {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}
