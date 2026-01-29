"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
import { ArrowLeft, Plus, Loader2, CheckCircle2, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import type { InvoiceForJournalEntry, JournalEntry } from "@/lib/types/journal-entry"

interface InvoiceLineItem {
  id: string
  description: string
  amount: number
}

interface InvoiceWithItems extends InvoiceForJournalEntry {
  items?: InvoiceLineItem[]
  ar_code?: string
  income_category_name?: string
}

export default function GenerateJournalEntriesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [invoices, setInvoices] = useState<InvoiceWithItems[]>([])
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set())

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

      // Check which invoices already have journal entries
      const { data: existingEntries } = await supabase
        .from("journal_entries")
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
    } catch (error) {
      console.error("Error fetching invoices:", error)
      toast.error({
        title: "Error",
        description: "Failed to load approved invoices.",
      })
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchApprovedInvoices()
  }, [fetchApprovedInvoices])

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

  // Memoize preview entries - grouped by category
  const previewEntries = useMemo(() => {
    const entries: Omit<JournalEntry, "id">[] = []

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
          reference: inv.invoice_number,
          billing_invoice_id: inv.id,
          debit: inv.totalAmount,
          credit: 0,
          remarks: "",
          ar_code: inv.ar_code || "",
        })
        categoryTotal += inv.totalAmount
      })

      // Category credit entry (category name at bottom)
      entries.push({
        reference: "",
        billing_invoice_id: null,
        debit: 0,
        credit: categoryTotal,
        remarks: "",
        ar_code: category,
      })
    })

    return entries
  }, [invoices, selectedInvoiceIds])

  const handleGenerate = async () => {
    if (selectedInvoiceIds.size === 0 || previewEntries.length === 0) return

    setGenerating(true)
    try {
      // Step 1: Create journal entry
      const { data: jeData, error: jeError } = await supabase
        .from("journal_entries")
        .insert({
          reference: `JE-${new Date().toISOString().slice(0, 10)}`,
          remarks: "",
        })
        .select("id")
        .single()

      if (jeError) throw jeError

      // Step 2: Link invoices via M2M table (account_titles_billing_invoices)
      const invoiceLinkEntries = selectedInvoiceIds.size > 0
        ? Array.from(selectedInvoiceIds).map((invoiceId) => {
            const invoice = invoices.find((inv) => inv.id === invoiceId)
            const totalAmount = invoice?.items?.reduce((sum, item) => sum + item.amount, 0) || 0
            return {
              journal_entry_id: jeData.id,
              billing_invoice_id: invoiceId,
              debit: totalAmount,
              credit: 0,
            }
          })
        : []

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
    } catch (error) {
      console.error("Error generating journal entries:", error)
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

  const totalDebit = previewEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredit = previewEntries.reduce((sum, entry) => sum + entry.credit, 0)

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

      {/* Invoice Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg">Select Invoices</Label>
          {selectedInvoiceIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedInvoiceIds(new Set())}>
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
                <TableHead>Account Titles</TableHead>
                <TableHead className="text-right w-32 border-l">Debit</TableHead>
                <TableHead className="text-right w-32 border-l">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Select invoices to preview entries
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {previewEntries.map((entry, index) => (
                    <TableRow
                      key={index}
                      className={entry.credit > 0 ? "font-semibold" : ""}
                    >
                      <TableCell className="pl-8">
                        {entry.ar_code || "-"}
                      </TableCell>
                      <TableCell className="text-right border-l">
                        {entry.credit > 0 ? "" : entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                      </TableCell>
                      <TableCell className="text-right border-l">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-medium">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right border-l">{formatCurrency(totalDebit)}</TableCell>
                    <TableCell className="text-right border-l">{formatCurrency(totalCredit)}</TableCell>
                  </TableRow>
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

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button variant="outline" asChild disabled={generating}>
          <Link href="/journal-entries">Cancel</Link>
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={selectedInvoiceIds.size === 0 || previewEntries.length === 0 || generating}
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
