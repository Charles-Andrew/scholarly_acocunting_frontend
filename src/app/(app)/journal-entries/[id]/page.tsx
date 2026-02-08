"use client"

import React, { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Loader2, Signature, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { useParams } from "next/navigation"
import type { BillingInvoiceUser } from "@/lib/types/invoice"

interface JournalEntryDetail {
  id: string
  created_at: string
  updated_at: string
  date: string
  entry_number: string | null
  prepared_by: string | null
  approved_by: string | null
}

interface LinkedInvoice {
  id: string
  billing_invoice_id: string
  invoice_number: string
  client_name: string
  grand_total: number
  discount: number
  amount_due: number
  ar_code: string
  category_name: string
  date: string
}

interface PreviewEntry {
  billing_invoice_id: string | null
  ar_code: string
  category_name: string
  isCreditEntry: boolean
  amount: number
}

const LOGO_URL = "https://gjrdshqnjalyivzeciyu.supabase.co/storage/v1/object/public/company-logos/scholarly_logo.png"

export default function JournalEntryDetailPage() {
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [entry, setEntry] = useState<JournalEntryDetail | null>(null)
  const [invoices, setInvoices] = useState<LinkedInvoice[]>([])
  const [categoryRecords, setCategoryRecords] = useState<{ category_name: string; remarks: string | null; reference: string }[]>([])
  const [users, setUsers] = useState<BillingInvoiceUser[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [preparedBySignature, setPreparedBySignature] = useState<{ signature_image: string; signed_at: string } | null>(null)
  const [approvedBySignature, setApprovedBySignature] = useState<{ signature_image: string; signed_at: string } | null>(null)
  const [isTogglingSignature, setIsTogglingSignature] = useState(false)

  const fetchJournalEntry = useCallback(async () => {
    if (!params.id) return

    setLoading(true)
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

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
            discount,
            amount_due,
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
            discount: number
            amount_due: number
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
          discount: Number(invoice.discount || 0),
          amount_due: Number(invoice.amount_due || invoice.grand_total),
          ar_code: client.accounts_receivable_code || "",
          category_name: invoice.income_categories?.name || "Uncategorized",
          date: invoice.date,
        }
      })

      // Fetch category records
      const { data: remarksData, error: remarksError } = await supabase
        .from("journal_entry_categories")
        .select("*")
        .eq("journal_entry_id", params.id)

      if (remarksError) throw remarksError
      setCategoryRecords(remarksData || [])
      setInvoices(formattedInvoices)

      // Fetch users for prepared_by and approved_by
      const { data: usersData } = await supabase
        .from("user_profiles")
        .select("id, email, full_name, position")

      if (usersData) {
        const formattedUsers = usersData.map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email?.split("@")[0] || u.email,
          position: u.position,
        }))
        setUsers(formattedUsers)

        // Fetch signatures from journal_entry_signatures table
        const { data: signatures } = await supabase
          .from("journal_entry_signatures")
          .select("signature_type, signature_image, signed_at")
          .eq("journal_entry_id", params.id)

        if (signatures) {
          signatures.forEach((sig) => {
            if (sig.signature_type === "prepared_by") {
              setPreparedBySignature({
                signature_image: sig.signature_image,
                signed_at: sig.signed_at,
              })
            } else if (sig.signature_type === "approved_by") {
              setApprovedBySignature({
                signature_image: sig.signature_image,
                signed_at: sig.signed_at,
              })
            }
          })
        }
      }
    } catch {
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
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleToggleSignature = async (signatureType: "prepared_by" | "approved_by") => {
    const hasSignature = signatureType === "prepared_by" ? preparedBySignature : approvedBySignature

    setIsTogglingSignature(true)
    try {
      if (hasSignature) {
        // Remove signature
        const response = await fetch(`/api/journal-entries/${params.id}/signature`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureType }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to remove signature")
        }

        if (signatureType === "prepared_by") {
          setPreparedBySignature(null)
        } else {
          setApprovedBySignature(null)
        }

        toast.success({
          title: "Signature Removed",
          description: "Your signature has been removed from this journal entry.",
        })
      } else {
        // Add signature
        const response = await fetch(`/api/journal-entries/${params.id}/signature`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signatureType }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to add signature")
        }

        // Get current user's signature image
        const userProfile = await supabase
          .from("user_profiles")
          .select("signature_image")
          .eq("id", currentUserId)
          .single()

        const signatureImage = userProfile.data?.signature_image

        if (signatureImage) {
          const newSignature = {
            signature_image: signatureImage,
            signed_at: new Date().toISOString(),
          }

          if (signatureType === "prepared_by") {
            setPreparedBySignature(newSignature)
          } else {
            setApprovedBySignature(newSignature)
          }
        }

        toast.success({
          title: "Signature Added",
          description: "Your signature has been added to this journal entry.",
        })
      }
    } catch (error) {
      toast.error({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to toggle signature.",
      })
    } finally {
      setIsTogglingSignature(false)
    }
  }

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

      // Invoice debit entries (AR debit) - use amount_due (after discount)
      invs.forEach((inv) => {
        entries.push({
          billing_invoice_id: inv.billing_invoice_id,
          ar_code: inv.ar_code || "",
          category_name: category,
          isCreditEntry: false,
          amount: inv.amount_due,
        })
        categoryTotal += inv.amount_due
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

  // Calculate totals
  const totalDebit = previewEntries.reduce((sum, entry) => sum + (entry.isCreditEntry ? 0 : entry.amount), 0)
  const totalCredit = previewEntries.reduce((sum, entry) => sum + (entry.isCreditEntry ? entry.amount : 0), 0)

  const preparedBy = users.find((u) => u.id === entry?.prepared_by)
  const approvedBy = users.find((u) => u.id === entry?.approved_by)

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
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/journal-entries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Journal Entry</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Journal Entry Document */}
      <div className="border rounded-lg overflow-hidden bg-white" id="journal-entry-print">
        {/* Section 1: Company Logo */}
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="relative h-20 w-[180px]">
            <Image
              src={LOGO_URL}
              alt="Scholarly Consulting"
              fill
              className="object-contain"
              unoptimized
              loading="eager"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">Alim St., Kidapawan City</p>
        </div>

        {/* Section 2: JOURNAL ENTRY Title */}
        <div className="px-8 py-4">
          <h1 className="text-2xl font-bold text-center text-gray-900 tracking-wide">JOURNAL ENTRY</h1>
        </div>

        {/* Section 3: Date and JE # */}
        <div className="px-8 py-4">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">Date:</p>
              <p className="text-base text-gray-900">{formatDate(entry.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">JE #:</p>
              <p className="text-base text-gray-900">{entry.entry_number || "-"}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Journal Entry Preview */}
        {previewEntries.length > 0 && (
          <div className="px-8 py-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-t border-b border-gray-400">
                  <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-32">Reference</th>
                  <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4">Account Titles</th>
                  <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-28">Debit</th>
                  <th className="text-right text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-28">Credit</th>
                  <th className="text-left text-sm font-semibold text-gray-900 uppercase tracking-wider py-3 px-4 w-40">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {previewEntries.map((entry, index) => {
                  const categoryRecord = categoryRecords.find(r => r.category_name === entry.category_name)
                  const rowSpan = remarksRowSpans[index]

                  return (
                    <React.Fragment key={index}>
                      <tr className={entry.isCreditEntry ? "font-semibold border-t border-gray-200" : "border-b border-gray-200"}>
                        {rowSpan > 0 && (
                          <td className="py-3 px-4 text-sm text-gray-900 align-top" rowSpan={rowSpan}>
                            {categoryRecord?.reference || "-"}
                          </td>
                        )}
                        <td className={`py-3 px-4 text-sm text-gray-900 ${entry.isCreditEntry ? "pl-8" : ""}`}>
                          {entry.ar_code || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          {!entry.isCreditEntry ? formatCurrency(entry.amount) : "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 text-right">
                          {entry.isCreditEntry ? formatCurrency(entry.amount) : "-"}
                        </td>
                        {rowSpan > 0 && (
                          <td className="py-3 px-4 text-sm text-gray-700 align-top" rowSpan={rowSpan}>
                            {categoryRecord?.remarks ? (
                              <span className="italic">{categoryRecord.remarks}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  )
                })}
                {/* Total Row */}
                <tr className="border-t-2 border-gray-900 font-bold">
                  <td className="py-3 px-4 text-sm text-gray-900" colSpan={2}>TOTAL</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(totalDebit)}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">{formatCurrency(totalCredit)}</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tbody>
            </table>
            {totalDebit !== totalCredit && (
              <p className="mt-2 text-sm text-amber-600 text-right">
                Warning: Debits and Credits do not balance.
              </p>
            )}
          </div>
        )}

        {/* Section 5: Prepared By and Approved By */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Prepared by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {preparedBySignature ? (
                    <Image
                      key={`prepared-${preparedBySignature.signed_at}`}
                      src={preparedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                      priority
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium border-b border-gray-900 pb-1">
                    {preparedBy?.full_name || preparedBy?.email || "-"}
                  </p>
                  {preparedBy?.position && (
                    <p className="text-xs text-gray-600 pt-1">{preparedBy.position}</p>
                  )}
                </div>
                {/* Hover button for current user */}
                {currentUserId &&
                  currentUserId === entry?.prepared_by && (
                  <button
                    onClick={() => handleToggleSignature("prepared_by")}
                    disabled={isTogglingSignature}
                    className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all duration-200 print:hidden opacity-0 group-hover:opacity-100 z-50 ${
                      preparedBySignature
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    title={preparedBySignature ? "Remove signature" : "Add signature"}
                  >
                    {preparedBySignature ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Signature className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="relative group">
              <p className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Approved by:</p>
              <div className="relative inline-block min-w-[200px]">
                <div className="relative h-16 -mb-8">
                  {approvedBySignature ? (
                    <Image
                      key={`approved-${approvedBySignature.signed_at}`}
                      src={approvedBySignature.signature_image}
                      alt="Signature"
                      fill
                      className="object-contain z-10"
                      unoptimized
                      priority
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm text-gray-900 font-medium border-b border-gray-900 pb-1">
                    {approvedBy?.full_name || approvedBy?.email || "-"}
                  </p>
                  {approvedBy?.position && (
                    <p className="text-xs text-gray-600 pt-1">{approvedBy.position}</p>
                  )}
                </div>
                {/* Hover button for current user */}
                {currentUserId &&
                  currentUserId === entry?.approved_by && (
                  <button
                    onClick={() => handleToggleSignature("approved_by")}
                    disabled={isTogglingSignature}
                    className={`absolute -top-2 -right-2 p-1.5 rounded-full shadow-md transition-all duration-200 print:hidden opacity-0 group-hover:opacity-100 z-50 ${
                      approvedBySignature
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    title={approvedBySignature ? "Remove signature" : "Add signature"}
                  >
                    {approvedBySignature ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Signature className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Footer */}
        <div className="px-8 py-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span>0910-027-7571</span>
              <span className="text-gray-400">{'//'}</span>
              <span>0966-167-4592</span>
            </div>
            <div className="flex flex-col items-center">
              <span>scholarlyconsulting.co</span>
            </div>
            <div>
              <span>info@scholarlyconsulting.co</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #journal-entry-print, #journal-entry-print * {
            visibility: visible;
          }
          #journal-entry-print {
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
