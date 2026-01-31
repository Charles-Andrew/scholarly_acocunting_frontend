/**
 * General Voucher type definition
 */
export type GeneralVoucher = {
  id: string
  created_at: string
  updated_at: string
  date: string
  particulars: string
  reference: string | null
  amount: number
  created_by: string | null
  recipient_id: string | null
  gv_id: string | null
  prepared_by: string | null
  checked_by: string | null
  approved_by: string | null
  // Joined data
  prepared_by_signature?: { signature_image: string; signed_at: string } | null
  checked_by_signature?: { signature_image: string; signed_at: string } | null
  approved_by_signature?: { signature_image: string; signed_at: string } | null
  prepared_by_name?: string
  checked_by_name?: string
  approved_by_name?: string
}

/**
 * General Voucher Journal Entry type
 */
export type GeneralVoucherJournalEntry = {
  id: string
  general_voucher_id: string
  journal_entry_category_id: string
  created_at: string
}

/**
 * General Voucher with Journal Entries
 */
export type GeneralVoucherWithJournalEntries = GeneralVoucher & {
  journal_entries?: GeneralVoucherJournalEntry[]
}

/**
 * Journal entry category for general vouchers
 */
export type GeneralVoucherJournalEntryCategory = {
  id: string
  category_name: string
  reference: string | null
  remarks: string | null
}

/**
 * Linked invoice for general voucher details
 */
export type GeneralVoucherLinkedInvoice = {
  id: string
  billing_invoice_id: string
  invoice_number: string
  client_name: string
  grand_total: number
  ar_code: string
}

/**
 * Detailed voucher type with all relations
 */
export type VoucherDetail = GeneralVoucher & {
  recipient?: {
    id: string
    full_name: string | null
    email: string
    position?: string | null
    signature_image?: string | null
  } | null
  journal_entry_categories?: GeneralVoucherJournalEntryCategory | null
  linked_invoices: GeneralVoucherLinkedInvoice[]
}
