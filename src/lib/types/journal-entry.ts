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
