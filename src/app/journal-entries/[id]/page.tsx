"use client"

import React, { useState, useEffect, useCallback } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { useParams } from "next/navigation"

interface JournalEntryDetail {
  id: string
  created_at: string
  updated_at: string
}

interface JournalEntryCategory {
  id: string
  journal_entry_id: string
  category_name: string
  remarks: string | null
  reference: string
  created_at: string
  updated_at: string
}

interface LinkedInvoice {
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

interface PreviewEntry {
  billing_invoice_id: string | null
  ar_code: string
  category_name: string
  isCreditEntry: boolean
  amount: number
}

export default function JournalEntryDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null)
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([])
  const [categoryRecords, setCategoryRecords] = useState<JournalEntryCategory[]>([])

  const fetchJournalEntry = useCallback(async () => {
    if (!params.id) return

    setLoading(true)
    try {
      // Fetch journal entry header
      const { data: entryData, error: entryError } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("id", params.id)
        .single()

      if (entryError) throw entryError
      setEntry(entryData)

      // Fetch linked invoices with details
      const { data: linkedData, error: linkedError } = await supabase
        .from("account_titles_billing_invoices")
        .select(`
          id,
          billing_invoice_id,
          billing_invoices!inner(
            invoice_number,
            grand_total,
            date,
            income_category_id,
            income_categories:income_category_id(name),
            clients!inner(name, accounts_receivable_code)
          )
        `)
        .eq("journal_entry_id", params.id)

      if (linkedError) throw linkedError

      // Format the linked invoices
      const formattedInvoices: LinkedInvoice[] = (linkedData || []).map((link: unknown) => {
        const linkData = link as {
          id: string
          billing_invoice_id: string
          billing_invoices: {
            invoice_number: string
            grand_total: number
            date: string
            income_categories: { name: string } | null
            clients: {
              name: string
              accounts_receivable_code: string
            }
          }
        }
        const invoice = linkData.billing_invoices
        const client = invoice.clients
        return {
          id: linkData.id,
          billing_invoice_id: linkData.billing_invoice_id,
          invoice_number: invoice.invoice_number,
          client_name: client.name,
          grand_total: Number(invoice.grand_total),
          ar_code: client.accounts_receivable_code || "",
          category_name: invoice.income_categories?.name || "Uncategorized",
        }
      })

      // Fetch line items for each invoice
      for (const invoice of formattedInvoices) {
        const { data: itemsData } = await supabase
          .from("billing_invoice_items")
          .select("description, amount")
          .eq("invoice_id", invoice.billing_invoice_id)

        invoice.items = itemsData || []
      }

      setInvoices(formattedInvoices)

      // Fetch category records
      const { data: remarksData, error: remarksError } = await supabase
        .from("journal_entry_categories")
        .select("*")
        .eq("journal_entry_id", params.id)

      if (remarksError) {
        console.error("Error fetching category records:", remarksError)
      } else {
        setCategoryRecords(remarksData || [])
      }
    } catch (error) {
      console.error("Error fetching journal entry:", error)
      toast.error({
        title: "Error",
        description: "Failed to load journal entry details.",
      })
    } finally {
      setLoading(false)
    }
  }, [params.id, supabase])

  useEffect(() => {
    fetchJournalEntry()
  }, [fetchJournalEntry])

  const formatCurrency = (value: number) => {
    return `₱${value.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Calculate totals based on invoice amounts
  // Total debit = sum of all attached invoice amounts (AR Debit)
  // Total credit = same amount (Revenue Credit)
  const totalDebit = invoices.reduce((sum, inv) => sum + inv.grand_total, 0)
  const totalCredit = totalDebit

  // Build preview entries - grouped by category like the generate page
  const previewEntries: PreviewEntry[] = (() => {
    const entries: PreviewEntry[] = []

    // Group invoices by category
    const categoryGroups: Record<string, LinkedInvoice[]> = {}

    invoices.forEach((invoice) => {
      const category = invoice.category_name || "Uncategorized"
      if (!categoryGroups[category]) {
        categoryGroups[category] = []
      }
      categoryGroups[category].push(invoice)
    })

    // Build entries grouped by category
    Object.entries(categoryGroups).forEach(([category, invs]) => {
      let categoryTotal = 0

      // Invoice debit entries (AR debit)
      invs.forEach((inv) => {
        entries.push({
          billing_invoice_id: inv.billing_invoice_id,
          ar_code: inv.ar_code || "",
          category_name: category,
          isCreditEntry: false,
          amount: inv.grand_total,
        })
        categoryTotal += inv.grand_total
      })

      // Category credit entry (revenue credit)
      entries.push({
        billing_invoice_id: null,
        ar_code: category,
        category_name: category,
        isCreditEntry: true,
        amount: categoryTotal,
      })
    })

    return entries
  })()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/journal-entries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Journal Entry Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            The requested journal entry could not be found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/journal-entries">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Journal Entry</h1>
          <p className="text-muted-foreground">
            Created on {formatDate(entry.created_at)}
          </p>
        </div>
      </div>

      {/* Journal Entry Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Entry Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Date Created</label>
                <p>{formatDate(entry.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p>{formatDate(entry.updated_at)}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Linked Invoices</label>
                <div className="flex flex-wrap gap-2">
                  {invoices.length === 0 ? (
                    <span className="text-muted-foreground">-</span>
                  ) : (
                    invoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/billing-invoice/${invoice.billing_invoice_id}/view`}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {invoice.invoice_number}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Total Debit</label>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalDebit)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <label className="text-sm font-medium text-muted-foreground">Total Credit</label>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalCredit)}</p>
              </div>
            </div>
            {totalDebit !== totalCredit && (
              <p className="mt-4 text-sm text-amber-600">
                Warning: Debits and Credits do not balance.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Journal Entry Preview */}
      {previewEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Journal Entry Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="border-l">Account Titles</TableHead>
                    <TableHead className="text-right w-32 border-l">Debit</TableHead>
                    <TableHead className="text-right w-32 border-l">Credit</TableHead>
                    <TableHead className="w-48 border-l">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewEntries.map((entry, index) => {
                    const categoryRecord = categoryRecords.find(r => r.category_name === entry.category_name)
                    const isFirstInGroup = index === 0 || previewEntries[index - 1].isCreditEntry;

                    return (
                      <React.Fragment key={index}>
                        {isFirstInGroup && (
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Journal Entry Reference:
                                </span>
                                <span className="text-sm font-semibold text-blue-600">
                                  {categoryRecord?.reference || "-"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow className={entry.isCreditEntry ? "font-semibold" : ""}>
                          <TableCell className="border-l pl-8">
                            {entry.ar_code || "-"}
                          </TableCell>
                          <TableCell className="text-right border-l">
                            {!entry.isCreditEntry ? formatCurrency(entry.amount) : ""}
                          </TableCell>
                          <TableCell className="text-right border-l">
                            {entry.isCreditEntry ? formatCurrency(entry.amount) : ""}
                          </TableCell>
                          <TableCell className="border-l">
                            {categoryRecord?.remarks ? (
                              <span className="text-xs text-muted-foreground italic">
                                {categoryRecord.remarks}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalDebit !== totalCredit && (
              <p className="mt-4 text-sm text-amber-600">
                Warning: Debits and Credits do not balance.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
