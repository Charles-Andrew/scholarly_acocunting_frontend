"use client"

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Printer, FileText, User, Calendar, Hash, CreditCard } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  GeneralVoucherJournalEntryCategory,
  GeneralVoucherLinkedInvoice,
  VoucherDetail,
} from "@/lib/types/general-voucher"

interface GeneralVoucherPageProps {
  params: Promise<{
    id: string
  }>
}

export default function GeneralVoucherDetailPage({ params }: GeneralVoucherPageProps) {
  const resolvedParams = React.use(params)
  const supabase = createClient()
  const [voucher, setVoucher] = React.useState<VoucherDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchVoucherData = React.useCallback(async () => {
    try {
      // Fetch voucher
      const { data: voucherData, error: voucherError } = await supabase
        .from("general_vouchers")
        .select("*")
        .eq("id", resolvedParams.id)
        .single()

      if (voucherError) throw voucherError

      if (!voucherData) {
        setVoucher(null)
        setIsLoading(false)
        return
      }

      // Fetch recipient separately from user_profiles
      let recipient: VoucherDetail['recipient'] = null
      if (voucherData.recipient_id) {
        const { data: recipientData } = await supabase
          .from("user_profiles")
          .select("id, full_name, email")
          .eq("id", voucherData.recipient_id)
          .single()

        if (recipientData) {
          recipient = recipientData
        }
      }

      // Fetch associated journal entry category
      const { data: junctionData, error: junctionError } = await supabase
        .from("general_voucher_journal_entries")
        .select("journal_entry_category_id")
        .eq("general_voucher_id", resolvedParams.id)
        .single()

      if (junctionError && junctionError.code !== "PGRST116") throw junctionError

      let category: GeneralVoucherJournalEntryCategory | null = null
      let linkedInvoices: GeneralVoucherLinkedInvoice[] = []

      if (junctionData?.journal_entry_category_id) {
        // Fetch category details
        const { data: categoryData, error: categoryError } = await supabase
          .from("journal_entry_categories")
          .select("id, category_name, reference, remarks")
          .eq("id", junctionData.journal_entry_category_id)
          .single()

        if (categoryError) throw categoryError
        category = categoryData

        // Fetch linked invoices through journal_entry_id
        const { data: jeData, error: jeError } = await supabase
          .from("journal_entry_categories")
          .select("journal_entry_id")
          .eq("id", junctionData.journal_entry_category_id)
          .single()

        if (jeError) throw jeError

        if (jeData?.journal_entry_id) {
          // Fetch linked invoices with details
          const { data: linkedData, error: linkedError } = await supabase
            .from("account_titles_billing_invoices")
            .select(`
              id,
              billing_invoice_id,
              billing_invoices!inner(
                invoice_number,
                grand_total,
                clients!inner(name, accounts_receivable_code)
              )
            `)
            .eq("journal_entry_id", jeData.journal_entry_id)

          if (linkedError) throw linkedError

          linkedInvoices = (linkedData || []).map((link: unknown) => {
            const linkData = link as {
              id: string
              billing_invoice_id: string
              billing_invoices: {
                invoice_number: string
                grand_total: number
                clients: {
                  name: string
                  accounts_receivable_code: string
                }
              }
            }
            return {
              id: linkData.id,
              billing_invoice_id: linkData.billing_invoice_id,
              invoice_number: linkData.billing_invoices.invoice_number,
              client_name: linkData.billing_invoices.clients.name,
              grand_total: Number(linkData.billing_invoices.grand_total),
              ar_code: linkData.billing_invoices.clients.accounts_receivable_code || "",
            }
          })
        }
      }

      setVoucher({
        ...voucherData,
        recipient,
        journal_entry_categories: category,
        linked_invoices: linkedInvoices,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to load general voucher data.",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, resolvedParams.id])

  React.useEffect(() => {
    fetchVoucherData()
  }, [fetchVoucherData])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatCurrency = (value: number) => {
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handlePrint = () => {
    window.print()
  }

  // Calculate preview entries for journal display
  const previewEntries = React.useMemo(() => {
    if (!voucher?.linked_invoices.length) return []

    const entries: {
      account_title: string
      debit: number | null
      credit: number | null
      source: string
    }[] = []

    // Debit entries from invoices
    voucher.linked_invoices.forEach((inv) => {
      entries.push({
        account_title: inv.ar_code || "Accounts Receivable",
        debit: inv.grand_total,
        credit: null,
        source: inv.invoice_number,
      })
    })

    // Credit entry from category
    if (voucher.journal_entry_categories) {
      entries.push({
        account_title: voucher.journal_entry_categories.category_name,
        debit: null,
        credit: voucher.amount,
        source: "Revenue Credit",
      })
    }

    return entries
  }, [voucher])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Loading...</h1>
        </div>
      </div>
    )
  }

  if (!voucher) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Voucher Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            The requested general voucher could not be found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/general-voucher">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">General Voucher</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Reference: {voucher.reference || "N/A"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button asChild>
            <Link href={`/general-voucher/${voucher.id}/edit`}>
              Edit Voucher
            </Link>
          </Button>
        </div>
      </div>

      {/* Voucher Document */}
      <div className="border rounded-lg overflow-hidden bg-white" id="voucher-print">
        {/* Document Header */}
        <div className="bg-gray-50 border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Scholarly</h2>
              <p className="text-sm text-gray-500 mt-1">Accounting Services</p>
            </div>
            <div className="text-right">
              <h1 className="text-xl font-semibold text-gray-900">GENERAL VOUCHER</h1>
              <p className="text-sm text-gray-500 mt-1">
                Created: {formatDate(voucher.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Voucher Details Grid */}
        <div className="border-b p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Recipient
                </h3>
                <p className="text-sm text-gray-900">
                  {voucher.recipient?.full_name || voucher.recipient?.email || "N/A"}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </h3>
                <p className="text-sm text-gray-900">{formatDate(voucher.date)}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Reference
                </h3>
                <p className="text-sm text-gray-900">{voucher.reference || "N/A"}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Amount
                </h3>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(voucher.amount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Particulars */}
        <div className="border-b p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Particulars
          </h3>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{voucher.particulars}</p>
        </div>

        {/* Journal Entries */}
        {previewEntries.length > 0 && (
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Journal Entries
            </h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Account Titles</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className={!entry.debit ? "pl-8 font-semibold" : ""}>
                        {entry.account_title}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.debit ? formatCurrency(entry.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit ? formatCurrency(entry.credit) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #voucher-print, #voucher-print * {
            visibility: visible;
          }
          #voucher-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
