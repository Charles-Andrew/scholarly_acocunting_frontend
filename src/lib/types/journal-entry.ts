/**
 * Journal Entry type definition
 */
export type JournalEntry = {
  id: string
  created_at: string | null
  updated_at: string | null
  date: string | null
  entry_number: string | null
  prepared_by: string | null
  approved_by: string | null
  status: "draft" | "for_approval" | "approved"
  // Joined data
  prepared_by_signature?: { signature_image: string; signed_at: string } | null
  approved_by_signature?: { signature_image: string; signed_at: string } | null
  prepared_by_name?: string
  approved_by_name?: string
}

/**
 * Invoice with minimal fields for journal entry generation
 */
export type InvoiceForJournalEntry = {
  id: string
  invoice_number: string
  client_name: string
  grand_total: number
  discount: number
  amount_due: number
  date: string
}

/**
 * Invoice line item for preview
 */
export type InvoiceLineItem = {
  id: string
  description: string
  amount: number
}

/**
 * Journal entry category record
 */
export type JournalEntryCategory = {
  id?: string
  journal_entry_id?: string
  category_name: string
  remarks?: string | null
  reference?: string
  created_at?: string
  updated_at?: string
}

/**
 * Linked invoice from billing for journal entry details
 */
export type LinkedInvoice = {
  id: string
  billing_invoice_id: string
  invoice_number: string
  client_name: string
  grand_total: number
  discount: number
  amount_due: number
  ar_code: string
  category_name: string
  items?: {
    description: string
    amount: number
  }[]
}

/**
 * Extended invoice with items for journal entry generation
 */
export type InvoiceWithItems = InvoiceForJournalEntry & {
  items?: InvoiceLineItem[]
  ar_code?: string
  income_category_name?: string
  totalAmount?: number
}
