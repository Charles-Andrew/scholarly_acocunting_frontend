/**
 * Journal Entry type definition
 */
export type JournalEntry = {
  id: string
  created_at: string | null
  updated_at: string | null
}

/**
 * Invoice with minimal fields for journal entry generation
 */
export type InvoiceForJournalEntry = {
  id: string
  invoice_number: string
  client_name: string
  grand_total: number
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
