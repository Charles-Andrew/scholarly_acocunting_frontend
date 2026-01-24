export interface BankAccount {
  id: string
  name: string
  bank_name: string
  account_number: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  accounts_receivable_code: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  position: string | null
  signature_image?: string | null
  created_at: string | null
}
