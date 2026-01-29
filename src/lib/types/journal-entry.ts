/**
 * Journal Entry type definition
 */
export type JournalEntry = {
  id: string
  reference: string
  billing_invoice_id: string | null
  debit: number
  credit: number
  remarks: string | null
  ar_code: string | null
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
