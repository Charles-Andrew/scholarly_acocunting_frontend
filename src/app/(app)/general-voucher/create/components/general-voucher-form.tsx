"use client"

import React, { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface JournalEntryCategory {
  id: string
  category_name: string
  reference: string | null
  remarks: string | null
}

interface LinkedInvoice {
  id: string
  billing_invoice_id: string
  invoice_number: string
  client_name: string
  grand_total: number
  ar_code: string
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

interface User {
  id: string
  email: string
  full_name: string | null
}

interface GeneralVoucherFormProps {
  voucherId?: string
}

export function GeneralVoucherForm({ voucherId }: GeneralVoucherFormProps) {
  const supabase = createClient()
  const isEditMode = !!voucherId

  // Form state
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [particulars, setParticulars] = useState<string>("")
  const [reference, setReference] = useState<string>("")
  const [recipientId, setRecipientId] = useState<string>("none")

  // Users list for recipient selection
  const [users, setUsers] = useState<User[]>([])
  const [isFetchingUsers, setIsFetchingUsers] = useState(true)

  // Journal entries selection
  const [categories, setCategories] = useState<JournalEntryCategory[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")

  // Selected journal entry details
  const [linkedInvoices, setLinkedInvoices] = useState<LinkedInvoice[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // Computed amount based on selected journal entry
  const amount = linkedInvoices.reduce((sum, inv) => sum + inv.grand_total, 0)

  // Loading states
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [isSaving, setIsSaving] = useState(false)
  const [isFetchingCategories, setIsFetchingCategories] = useState(true)

  // Fetch users for recipient selection
  const fetchUsers = useCallback(async () => {
    setIsFetchingUsers(true)
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, email, full_name")
        .eq("is_active", true)
        .order("full_name", { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch {
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "error",
      })
    } finally {
      setIsFetchingUsers(false)
    }
  }, [supabase])

  // Ref to access current selectedCategoryId without triggering refetch
  const selectedCategoryIdRef = React.useRef(selectedCategoryId)
  useEffect(() => {
    selectedCategoryIdRef.current = selectedCategoryId
  }, [selectedCategoryId])

  // Fetch journal entry categories (only unused ones, or current selection in edit mode)
  const fetchCategories = useCallback(async () => {
    setIsFetchingCategories(true)
    try {
      // First, get all categories that are already linked to general vouchers
      const { data: usedCategories, error: usedError } = await supabase
        .from("general_voucher_journal_entries")
        .select("journal_entry_category_id")

      if (usedError) throw usedError

      const usedCategoryIds = new Set(
        (usedCategories || []).map((item) => item.journal_entry_category_id)
      )

      // Fetch all categories
      const { data: allCategories, error } = await supabase
        .from("journal_entry_categories")
        .select("id, category_name, reference, remarks")
        .order("category_name", { ascending: true })

      if (error) throw error

      // Filter out used categories, but keep the current selection if in edit mode
      // Use ref to access current value without making it a dependency
      const currentSelectedId = selectedCategoryIdRef.current
      const filteredCategories = (allCategories || []).filter(
        (cat) =>
          !usedCategoryIds.has(cat.id) ||
          (isEditMode && cat.id === currentSelectedId)
      )

      setCategories(filteredCategories)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load journal entry categories.",
        variant: "error",
      })
    } finally {
      setIsFetchingCategories(false)
    }
  }, [supabase, isEditMode])

  // Fetch existing voucher data for edit mode
  const fetchVoucherData = useCallback(async () => {
    if (!voucherId) return

    setIsLoading(true)
    try {
      // Fetch voucher
      const { data: voucherData, error: voucherError } = await supabase
        .from("general_vouchers")
        .select("*")
        .eq("id", voucherId)
        .single()

      if (voucherError) throw voucherError

      if (voucherData) {
        setDate(voucherData.date)
        setParticulars(voucherData.particulars)
        setReference(voucherData.reference || "")
        setRecipientId(voucherData.recipient_id || "none")

        // Fetch associated journal entry categories
        const { data: junctionData, error: junctionError } = await supabase
          .from("general_voucher_journal_entries")
          .select("journal_entry_category_id")
          .eq("general_voucher_id", voucherId)

        if (junctionError) throw junctionError

        if (junctionData && junctionData.length > 0) {
          setSelectedCategoryId(junctionData[0].journal_entry_category_id)
        }
      }
    } catch (error) {
      console.error("Error fetching voucher:", error)
      toast({
        title: "Error",
        description: "Failed to load general voucher data.",
        variant: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, voucherId])

  useEffect(() => {
    fetchCategories()
    fetchUsers()
  }, [fetchCategories, fetchUsers])

  useEffect(() => {
    if (isEditMode) {
      fetchVoucherData()
    }
  }, [isEditMode, fetchVoucherData])

  // Ref to track the latest fetch request to prevent race conditions
  const latestFetchRef = React.useRef<string>("")

  // Fetch journal entry details when selection changes
  const fetchJournalEntryDetails = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setLinkedInvoices([])
      return
    }

    // Track this request as the latest one
    const requestId = crypto.randomUUID()
    latestFetchRef.current = requestId

    setIsLoadingDetails(true)
    try {
      // Fetch linked invoices with details - filter by category ID
      // This ensures each category only shows its own invoices
      const { data: linkedData, error: linkedError } = await supabase
        .from("account_titles_billing_invoices")
        .select(`
          id,
          billing_invoice_id,
          journal_entry_category_id,
          billing_invoices!inner(
            invoice_number,
            grand_total,
            date,
            clients!inner(name, accounts_receivable_code)
          )
        `)
        .eq("journal_entry_category_id", categoryId)

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

      // Only update state if this is still the latest request
      if (latestFetchRef.current === requestId) {
        setLinkedInvoices(formattedInvoices)
      }
    } catch {
      // Only show error if this is still the latest request
      if (latestFetchRef.current === requestId) {
        toast({
          title: "Error",
          description: "Failed to load journal entry details.",
          variant: "error",
        })
      }
    } finally {
      // Only clear loading if this is still the latest request
      if (latestFetchRef.current === requestId) {
        setIsLoadingDetails(false)
      }
    }
  }, [supabase])

  // Handle category selection change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    fetchJournalEntryDetails(categoryId)
  }

  // Fetch journal entry details when selectedCategoryId changes (for edit mode)
  useEffect(() => {
    if (selectedCategoryId) {
      fetchJournalEntryDetails(selectedCategoryId)
    }
  }, [selectedCategoryId, fetchJournalEntryDetails])

  // Build preview entries based on linked invoices
  const previewEntries: PreviewEntry[] = React.useMemo(() => {
    if (linkedInvoices.length === 0) return []

    const entries: PreviewEntry[] = []
    let totalAmount = 0

    // Invoice debit entries
    linkedInvoices.forEach((inv) => {
      entries.push({
        billing_invoice_id: inv.billing_invoice_id,
        ar_code: inv.ar_code || "",
        category_name: "",
        isCreditEntry: false,
        amount: inv.grand_total,
      })
      totalAmount += inv.grand_total
    })

    // Category credit entry
    const selectedCategory = categories.find(c => c.id === selectedCategoryId)
    if (selectedCategory) {
      entries.push({
        billing_invoice_id: null,
        ar_code: selectedCategory.category_name,
        category_name: selectedCategory.category_name,
        isCreditEntry: true,
        amount: totalAmount,
      })
    }

    return entries
  }, [linkedInvoices, selectedCategoryId, categories])

  // Validation
  const validateForm = (): boolean => {
    if (!date) {
      toast({
        title: "Validation Error",
        description: "Date is required.",
        variant: "error",
      })
      return false
    }

    if (!particulars.trim()) {
      toast({
        title: "Validation Error",
        description: "Particulars are required.",
        variant: "error",
      })
      return false
    }

    if (!selectedCategoryId) {
      toast({
        title: "Validation Error",
        description: "Please select a journal entry.",
        variant: "error",
      })
      return false
    }

    return true
  }

  // Save handler
  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const voucherData = {
        date,
        particulars: particulars.trim(),
        reference: reference.trim() || null,
        amount: amount,
        recipient_id: recipientId === "none" ? null : recipientId,
      }

      let voucherIdToUse = voucherId

      if (isEditMode && voucherId) {
        // Update existing voucher
        const { error: updateError } = await supabase
          .from("general_vouchers")
          .update({
            ...voucherData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", voucherId)

        if (updateError) throw updateError

        // Delete existing junction records and re-insert
        const { error: deleteError } = await supabase
          .from("general_voucher_journal_entries")
          .delete()
          .eq("general_voucher_id", voucherId)

        if (deleteError) throw deleteError

        voucherIdToUse = voucherId
      } else {
        // Create new voucher
        const { data: newVoucher, error: insertError } = await supabase
          .from("general_vouchers")
          .insert(voucherData)
          .select()
          .single()

        if (insertError) throw insertError
        voucherIdToUse = newVoucher.id
      }

      // Insert junction record for single selection
      if (selectedCategoryId) {
        const { error: junctionError } = await supabase
          .from("general_voucher_journal_entries")
          .insert({
            general_voucher_id: voucherIdToUse,
            journal_entry_category_id: selectedCategoryId,
          })

        if (junctionError) throw junctionError
      }

      toast({
        title: "Success",
        description: isEditMode
          ? "General voucher updated successfully."
          : "General voucher created successfully.",
      })

      // Redirect to list page
      window.location.href = "/general-voucher"
    } catch {
      toast({
        title: "Error",
        description: "Failed to save general voucher. Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/general-voucher">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {isEditMode ? "Edit General Voucher" : "Create General Voucher"}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voucher Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="recipient">To (Recipient)</Label>
              <Select
                value={recipientId}
                onValueChange={setRecipientId}
                disabled={isFetchingUsers}
              >
                <SelectTrigger id="recipient">
                  <SelectValue placeholder="Select a recipient (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="particulars">
              Particulars <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="particulars"
              placeholder="Enter voucher particulars/description"
              value={particulars}
              onChange={(e) => setParticulars(e.target.value)}
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference</Label>
            <Input
              id="reference"
              type="text"
              placeholder="Enter reference number"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {isFetchingCategories ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No journal entries found.
            </div>
          ) : (
            <RadioGroup
              value={selectedCategoryId}
              onValueChange={handleCategoryChange}
              className="rounded-md border overflow-auto"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow
                      key={category.id}
                      className={
                        selectedCategoryId === category.id
                          ? "bg-muted/50 cursor-pointer"
                          : "cursor-pointer"
                      }
                      onClick={() => handleCategoryChange(category.id)}
                    >
                      <TableCell>
                        <RadioGroupItem
                          value={category.id}
                          id={category.id}
                        />
                      </TableCell>
                      <TableCell>
                        {category.reference || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        <label
                          htmlFor={category.id}
                          className="cursor-pointer flex items-center gap-2"
                        >
                          {category.category_name}
                        </label>
                      </TableCell>
                      <TableCell>
                        {category.remarks || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </RadioGroup>
          )}

          {/* Journal Entry Preview */}
          {selectedCategoryId && (
            <div className="mt-6 space-y-4">
              {isLoadingDetails ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : previewEntries.length > 0 ? (
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Journal Entry Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableCell colSpan={4} className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">
                                  Journal Entry Reference:
                                </span>
                                <span className="text-sm font-semibold text-blue-600">
                                  {categories.find(c => c.id === selectedCategoryId)?.reference || "-"}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableHead className="border-l">Account Titles</TableHead>
                            <TableHead className="text-right w-32 border-l">Debit</TableHead>
                            <TableHead className="text-right w-32 border-l">Credit</TableHead>
                            <TableHead className="w-48 border-l">Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewEntries.map((entry, index) => (
                            <TableRow
                              key={index}
                              className={entry.isCreditEntry ? "font-semibold" : ""}
                            >
                              <TableCell className="border-l pl-8">
                                {entry.ar_code || "-"}
                              </TableCell>
                              <TableCell className="text-right border-l">
                                {!entry.isCreditEntry
                                  ? `₱${entry.amount.toFixed(2)}`
                                  : ""
                                }
                              </TableCell>
                              <TableCell className="text-right border-l">
                                {entry.isCreditEntry
                                  ? `₱${entry.amount.toFixed(2)}`
                                  : ""
                                }
                              </TableCell>
                              <TableCell className="border-l text-xs text-muted-foreground">
                                {entry.isCreditEntry
                                  ? "Revenue Credit"
                                  : linkedInvoices.find(inv =>
                                      inv.billing_invoice_id === entry.billing_invoice_id
                                    )?.invoice_number || "-"
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                  No invoices linked to this journal entry.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/general-voucher">Cancel</Link>
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !date || !particulars.trim() || !selectedCategoryId}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditMode ? "Update" : "Create"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
