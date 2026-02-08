"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"

import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import type { InvoiceForJournalEntry } from "@/lib/types/journal-entry"
import { RemarkModal } from "@/components/journal-entries/remark-modal"

interface User {
  id: string
  email: string
  full_name: string | null
}

interface InvoiceLineItem {
  id: string
  description: string
  amount: number
}

interface InvoiceWithItems extends InvoiceForJournalEntry {
  items?: InvoiceLineItem[]
  ar_code?: string
  income_category_name?: string
  totalAmount?: number
}

export default function GenerateJournalEntriesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]) // Default to today

  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([])
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())
  const [categoryRemarks, setCategoryRemarks] = useState<Record<string, string>>({})

  const [users, setUsers] = useState<User[]>([])
  const [preparedById, setPreparedById] = useState<string>("")
  const [approvedById, setApprovedById] = useState<string>("")

  const fetchApprovedInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("billing_invoices")
        .select(`
          id,
          invoice_number,
          date,
          grand_total,
          clients:client_id (name, accounts_receivable_code),
          income_categories:income_category_id (name),
          billing_invoice_items (id, description, amount)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Check which invoices already have journal entries via join table
      const { data: existingEntries } = await supabase
        .from("account_titles_billing_invoices")
        .select("billing_invoice_id")
        .in(
          "billing_invoice_id",
          (data || []).map((inv) => inv.id)
        )

      const invoicesWithEntries = new Set(existingEntries?.map((e) => e.billing_invoice_id) || [])

      const formattedInvoices: InvoiceWithItems[] = (data || [])
        .filter((inv) => !invoicesWithEntries.has(inv.id))
        .map((inv) => {
          const clientsData = inv.clients as unknown as { name: string; accounts_receivable_code: string } | null
          const categoriesData = inv.income_categories as unknown as { name: string } | null
          return {
            id: inv.id,
            invoice_number: inv.invoice_number,
            client_name: clientsData?.name || "",
            ar_code: clientsData?.accounts_receivable_code || "",
            income_category_name: categoriesData?.name || "",
            grand_total: inv.grand_total,
            date: inv.date,
            items: (inv.billing_invoice_items as unknown as InvoiceLineItem[]) || [],
          }
        })

      setInvoices(formattedInvoices)
    } catch {
      toast.error({
        title: "Error",
        description: "Failed to load approved invoices.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchUsers = useCallback(async () => {
    try {
      const [{ data: usersData }, { data: { user } }] = await Promise.all([
        supabase
          .from("user_profiles")
          .select("id, email, full_name")
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("full_name", { ascending: true }),
        supabase.auth.getUser(),
      ])

      if (usersData) {
        const formattedUsers = usersData.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email?.split("@")[0] || u.email,
        }))
        setUsers(formattedUsers)
      }

      // Auto-set prepared_by to current user
      if (user) {
        setPreparedById(user.id)
      }
    } catch {
      // Silently fail - users dropdown will be empty
    }
  }, [supabase])

  useEffect(() => {
    fetchApprovedInvoices()
    fetchUsers()
  }, [fetchApprovedInvoices, fetchUsers])

  const toggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev)
      if (next.has(invoiceId)) {
        next.delete(invoiceId)
      } else {
        next.add(invoiceId)
      }
      return next
    })
  }

  const toggleAll = () => {
    setSelectedInvoiceIds((prev) => {
      if (prev.size === invoices.length) {
        return new Set()
      }
      return new Set(invoices.map((inv) => inv.id))
    })
  }

  // Handle saving category remark
  const handleSaveRemark = (category: string, remark: string) => {
    setCategoryRemarks((prev) => ({
      ...prev,
      [category]: remark,
    }))
  }

  // Generate next entry number
  // Pattern: JE-YYYY-MM-XXX (auto-increment)
  const generateEntryNumber = useCallback(async (): Promise<string> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `JE-${year}-${month}-`

    // Find the highest sequence number for this month
    const { data: existingEntries, error } = await supabase
      .from("journal_entries")
      .select("entry_number")
      .like("entry_number", `${prefix}%`)
      .order("entry_number", { ascending: false })
      .limit(1)

    if (error || !existingEntries || existingEntries.length === 0) {
      return `${prefix}001`
    }

    const lastEntryNumber = existingEntries[0].entry_number
    const match = lastEntryNumber?.match(/-(\d{3})$/)

    if (match) {
      const lastNum = parseInt(match[1], 10)
      const nextNum = lastNum + 1
      return `${prefix}${String(nextNum).padStart(3, '0')}`
    }

    return `${prefix}001`
  }, [supabase])

  // Memoize preview entries - grouped by category
  const previewEntries = useMemo(() => {
    const entries: {
      invoice_number: string
      billing_invoice_id: string | null
      ar_code: string
      category_name: string
      isCreditEntry: boolean
      amount: number
    }[] = []

    // Group invoices by category
    const categoryGroups: Record<string, typeof invoices> = {}

    invoices.forEach((invoice) => {
      if (selectedInvoiceIds.has(invoice.id)) {
        const totalAmount = invoice.items?.reduce((sum, item) => sum + item.amount, 0) || 0

        if (totalAmount === 0) return

        const category = invoice.income_category_name || "Uncategorized"

        if (!categoryGroups[category]) {
          categoryGroups[category] = []
        }
        categoryGroups[category].push({ ...invoice, totalAmount })
      }
    })

    // Build entries grouped by category
    Object.entries(categoryGroups).forEach(([category, invs]) => {
      let categoryTotal = 0

      // Invoice debit entries
      invs.forEach((inv) => {
        entries.push({
          invoice_number: inv.invoice_number,
          billing_invoice_id: inv.id,
          ar_code: inv.ar_code || "",
          category_name: category,
          isCreditEntry: false,
          amount: inv.totalAmount || 0,
        })
        categoryTotal += inv.totalAmount || 0
      })

      // Category credit entry (category name at bottom)
      entries.push({
        invoice_number: "",
        billing_invoice_id: null,
        ar_code: category,
        category_name: category,
        isCreditEntry: true,
        amount: categoryTotal,
      })
    })

    return entries
  }, [invoices, selectedInvoiceIds])

  const handleGenerate = async () => {
    if (selectedInvoiceIds.size === 0 || previewEntries.length === 0 || !preparedById || !approvedById) {
      return
    }

    setGenerating(true)
    try {
      // Generate entry number
      const entryNumber = await generateEntryNumber()

      // Step 1: Create journal entry
      const { data: jeData, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          date: entryDate,
          entry_number: entryNumber,
          prepared_by: preparedById,
          approved_by: approvedById,
          status: "approved",
        })
        .select("id")
        .single()

      if (jeError) throw jeError

      // Step 2: Save category records for all unique categories FIRST
      // Get unique categories from selected invoices
      const selectedCategories = new Set<string>()
      invoices.forEach((invoice) => {
        if (selectedInvoiceIds.has(invoice.id)) {
          const category = invoice.income_category_name || "Uncategorized"
          selectedCategories.add(category)
        }
      })

      // Create a map to store category name -> category id
      const categoryIdMap: Record<string, string> = {}

      if (selectedCategories.size > 0) {
        // Generate records for each category (with or without remarks)
        const categoryEntries = []

        // Generate base reference and sequential numbers for all categories
        const baseReference = await generateCategoryReference()

        const match = baseReference.match(/^(GJV \d{4}-\d{2}-)(\d{3})$/)
        if (!match) {
          throw new Error(`Invalid base reference format: ${baseReference}`)
        }

        const prefix = match[1]
        const startNum = parseInt(match[2], 10)

        let categoryIndex = 0
        for (const category of selectedCategories) {
          // Generate sequential reference: base, base+1, base+2, etc.
          const reference = `${prefix}${String(startNum + categoryIndex).padStart(3, '0')}`

          const remark = categoryRemarks[category] || "" // Get remark if exists, otherwise empty
          categoryEntries.push({
            journal_entry_id: jeData.id,
            category_name: category,
            remarks: remark.trim() || null, // Store null if empty
            reference,
          })
          categoryIndex++
        }

        const { data: insertedCategories, error: catError } = await supabase
          .from("journal_entry_categories")
          .insert(categoryEntries)
          .select()

        if (catError) {
          toast.warning({
            title: "Warning",
            description: "Journal entry created but failed to save category records.",
          })
          throw catError
        }

        // Build category name -> id map
        insertedCategories?.forEach((cat) => {
          categoryIdMap[cat.category_name] = cat.id
        })
      }

      // Step 3: Link invoices via M2M table with category reference
      const invoiceLinkEntries = []
      for (const invoice of invoices) {
        if (selectedInvoiceIds.has(invoice.id)) {
          const category = invoice.income_category_name || "Uncategorized"
          invoiceLinkEntries.push({
            journal_entry_id: jeData.id,
            billing_invoice_id: invoice.id,
            journal_entry_category_id: categoryIdMap[category],
          })
        }
      }

      const { error: linkError } = await supabase
        .from("account_titles_billing_invoices")
        .insert(invoiceLinkEntries)

      if (linkError) throw linkError

      toast.success({
        title: "Journal Entries Generated",
        description: `Journal entry created with ${selectedInvoiceIds.size} invoice(s) linked.`,
      })

      // Redirect back to journal entries list
      window.location.href = "/journal-entries"
    } catch {
      toast.error({
        title: "Error",
        description: "Failed to generate journal entries.",
      })
    } finally {
      setGenerating(false)
    }
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toFixed(2)}`
  }

  // Generate next category reference
  // Pattern: GJV YYYY-MM-NNN (auto-increment globally across all categories)
  const generateCategoryReference = useCallback(async (): Promise<string> => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const prefix = `GJV ${year}-${month}-`

    // Find the highest sequence number across all categories
    const { data: existingEntries, error } = await supabase
      .from("journal_entry_categories")
      .select("reference")
      .like("reference", `${prefix}%`)
      .order("reference", { ascending: false })
      .limit(1)

    if (error) {
      return `${prefix}001`
    }

    if (!existingEntries || existingEntries.length === 0) {
      return `${prefix}001`
    }

    const lastReference = existingEntries[0].reference
    const match = lastReference?.match(/-(\d{3})$/)

    if (match) {
      const lastNum = parseInt(match[1], 10)
      const nextNum = lastNum + 1
      return `${prefix}${String(nextNum).padStart(3, '0')}`
    }

    return `${prefix}001`
  }, [supabase])

  const totalDebit = previewEntries
    .filter(entry => !entry.isCreditEntry)
    .reduce((sum, entry) => sum + entry.amount, 0)
  const totalCredit = previewEntries
    .filter(entry => entry.isCreditEntry)
    .reduce((sum, entry) => sum + entry.amount, 0)

  // Calculate row spans for remarks column - each category group spans its rows
  const getRemarksRowSpan = () => {
    const spans: number[] = []
    let currentCategory = ""
    let categoryStartIndex = 0
    let categoryRowCount = 0

    previewEntries.forEach((entry, index) => {
      if (entry.category_name !== currentCategory) {
        // New category - fill in span for previous category
        if (currentCategory !== "" && categoryRowCount > 0) {
          for (let i = 0; i < categoryRowCount; i++) {
            spans[categoryStartIndex + i] = i === 0 ? categoryRowCount : 0
          }
        }
        // Start new category
        currentCategory = entry.category_name
        categoryStartIndex = index
        categoryRowCount = 1
      } else {
        categoryRowCount++
      }
    })

    // Fill in last category
    if (currentCategory !== "" && categoryRowCount > 0) {
      for (let i = 0; i < categoryRowCount; i++) {
        spans[categoryStartIndex + i] = i === 0 ? categoryRowCount : 0
      }
    }

    return spans
  }

  const remarksRowSpans = getRemarksRowSpan()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/journal-entries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Generate Journal Entries</h1>
      </div>

      {/* Date Field */}
      <div className="space-y-2">
        <Label htmlFor="entry-date" className="text-lg">
          Entry Date <span className="text-red-500">*</span>
        </Label>
        <input
          id="entry-date"
          type="date"
          required
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Invoice Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg">Select Invoices</Label>
          {selectedInvoiceIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => {
              setSelectedInvoiceIds(new Set())
              setCategoryRemarks({})
            }}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Selection
            </Button>
          )}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={invoices.length > 0 && selectedInvoiceIds.size === invoices.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No approved invoices without journal entries
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvoiceIds.has(invoice.id)}
                        onCheckedChange={() => toggleInvoice(invoice.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(invoice.grand_total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <Label className="text-lg">Preview</Label>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="border-l">Account Titles</TableHead>
                <TableHead className="text-right w-32 border-l">Debit</TableHead>
                <TableHead className="text-right w-32 border-l">Credit</TableHead>
                <TableHead className="w-48 border-l">Remarks</TableHead>
                <TableHead className="w-32 border-l">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Select invoices to preview entries
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {previewEntries.map((entry, index) => {
                    const rowSpan = remarksRowSpans[index]
                    return (
                      <TableRow
                        key={index}
                        className={entry.isCreditEntry ? "font-semibold" : ""}
                      >
                        <TableCell className="border-l pl-8">
                          {entry.ar_code || "-"}
                        </TableCell>
                        <TableCell className="text-right border-l">
                          {!entry.isCreditEntry ? formatCurrency(entry.amount) : ""}
                        </TableCell>
                        <TableCell className="text-right border-l">
                          {entry.isCreditEntry ? formatCurrency(entry.amount) : ""}
                        </TableCell>
                        {rowSpan > 0 && (
                          <TableCell className="border-l align-middle text-center" rowSpan={rowSpan}>
                            {categoryRemarks[entry.category_name] ? (
                              <span className="text-xs text-muted-foreground italic">
                                {categoryRemarks[entry.category_name]}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {rowSpan > 0 && (
                          <TableCell className="border-l align-middle text-center" rowSpan={rowSpan}>
                            <RemarkModal
                              category={entry.category_name}
                              existingRemark={categoryRemarks[entry.category_name]}
                              onSave={(remark) => handleSaveRemark(entry.category_name, remark)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        {totalDebit !== totalCredit && (
          <p className="text-sm text-amber-600">
            Warning: Debits and Credits do not balance.
          </p>
        )}
      </div>

      {/* Approved By */}
      <div className="space-y-2 max-w-md">
        <Label htmlFor="approved-by" className="text-lg">
          Approved By <span className="text-red-500">*</span>
        </Label>
        <Select value={approvedById} onValueChange={setApprovedById}>
          <SelectTrigger id="approved-by" className="w-full">
            <SelectValue placeholder="Select a user" />
          </SelectTrigger>
          <SelectContent>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.full_name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button variant="outline" asChild disabled={generating}>
          <Link href="/journal-entries">Cancel</Link>
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={selectedInvoiceIds.size === 0 || previewEntries.length === 0 || !preparedById || !approvedById || generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
