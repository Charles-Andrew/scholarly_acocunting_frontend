"use client"

import * as React from "react"
import Image from "next/image"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Plus, Edit2, Power, PowerOff, MoreHorizontal, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SignaturePad } from "@/components/ui/signature-pad"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { BankAccount, UserProfile } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const [bankAccounts, setBankAccounts] = React.useState<BankAccount[]>([])
  const [users, setUsers] = React.useState<UserProfile[]>([])
  const [currentUser, setCurrentUser] = React.useState<UserProfile | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [loadingUsers, setLoadingUsers] = React.useState(false)
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [userFilter, setUserFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false)
  const [newUser, setNewUser] = React.useState({
    email: "",
    full_name: "",
    position: "",
    password: "",
    confirm_password: "",
  })
  const [passwordMatchStatus, setPasswordMatchStatus] = React.useState<"idle" | "matching" | "mismatch">("idle")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editPasswordData, setEditPasswordData] = React.useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [editPasswordMatchStatus, setEditPasswordMatchStatus] = React.useState<"idle" | "matching" | "mismatch">("idle")
  const [isToggleDialogOpen, setIsToggleDialogOpen] = React.useState(false)
  const [togglingUser, setTogglingUser] = React.useState<UserProfile | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [isAddBankOpen, setIsAddBankOpen] = React.useState(false)
  const [newBankAccount, setNewBankAccount] = React.useState({
    name: "",
    bank_name: "",
    account_number: "",
  })
  const [isSubmittingBank, setIsSubmittingBank] = React.useState(false)
  const [isDeleteBankDialogOpen, setIsDeleteBankDialogOpen] = React.useState(false)
  const [deletingBankAccount, setDeletingBankAccount] = React.useState<BankAccount | null>(null)
  const [bankAccountInUse, setBankAccountInUse] = React.useState(false)
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = React.useState(false)
  const [deletingUser, setDeletingUser] = React.useState<UserProfile | null>(null)
  const [userInUse, setUserInUse] = React.useState(false)
  const [userCleanupCount, setUserCleanupCount] = React.useState(0)
  const [errorDialogOpen, setErrorDialogOpen] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")

  const supabase = createClient()

  // Debounced password match check for Add User dialog
  React.useEffect(() => {
    if (!newUser.password || !newUser.confirm_password) {
      setPasswordMatchStatus("idle")
      return
    }

    const timer = setTimeout(() => {
      if (newUser.password === newUser.confirm_password) {
        setPasswordMatchStatus("matching")
      } else {
        setPasswordMatchStatus("mismatch")
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [newUser.password, newUser.confirm_password])

  // Debounced password match check for Edit User dialog
  React.useEffect(() => {
    if (!editPasswordData.new_password || !editPasswordData.confirm_password) {
      setEditPasswordMatchStatus("idle")
      return
    }

    const timer = setTimeout(() => {
      if (editPasswordData.new_password === editPasswordData.confirm_password) {
        setEditPasswordMatchStatus("matching")
      } else {
        setEditPasswordMatchStatus("mismatch")
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [editPasswordData.new_password, editPasswordData.confirm_password])

  const fetchBankAccounts = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .is("deleted_at", null)
        .order("name", { ascending: true })

      if (error) {
        return
      }

      setBankAccounts(data || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const fetchUsers = React.useCallback(async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .is("deleted_at", null)
        .order("full_name", { ascending: true })

      if (error) {
        return
      }

      setUsers(data || [])
    } catch {
    } finally {
      setLoadingUsers(false)
    }
  }, [supabase])

  const fetchCurrentUser = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setCurrentUserId(user.id)
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error) {
        } else {
          setCurrentUser(data)
        }
      }
    } catch {
    }
  }, [supabase])

  const validatePassword = (password: string): string | null => {
    if (password.length < 5) {
      return "Password must be at least 5 characters long"
    }
    return null
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) return

    // Validate password
    if (!newUser.password || !newUser.confirm_password) {
      setErrorMessage("Password and confirm password are required")
      setErrorDialogOpen(true)
      return
    }

    if (newUser.password !== newUser.confirm_password) {
      setErrorMessage("Password and confirm password do not match")
      setErrorDialogOpen(true)
      return
    }

    const passwordError = validatePassword(newUser.password)
    if (passwordError) {
      setErrorMessage(passwordError)
      setErrorDialogOpen(true)
      return
    }

    setIsSubmitting(true)
    try {
      // Call the API route to create user
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUser.email,
          full_name: newUser.full_name,
          position: newUser.position,
          password: newUser.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage("Failed to create user: " + data.error)
        setErrorDialogOpen(true)
        return
      }

      // Reset form and refresh users
      setNewUser({ email: "", full_name: "", position: "", password: "", confirm_password: "" })
      setIsAddUserOpen(false)
      fetchUsers()
    } catch {
      setErrorMessage("An unexpected error occurred")
      setErrorDialogOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.email || !editingUser.full_name) return

    const isEditingSelf = editingUser.id === currentUserId

    // Validate password change if editing self and password fields are filled
    if (isEditingSelf && (editPasswordData.new_password || editPasswordData.current_password || editPasswordData.confirm_password)) {
      if (!editPasswordData.current_password) {
        setErrorMessage("Current password is required to change password")
        setErrorDialogOpen(true)
        return
      }
      if (!editPasswordData.new_password) {
        setErrorMessage("New password is required")
        setErrorDialogOpen(true)
        return
      }
      if (!editPasswordData.confirm_password) {
        setErrorMessage("Please confirm your new password")
        setErrorDialogOpen(true)
        return
      }
      if (editPasswordData.new_password !== editPasswordData.confirm_password) {
        setErrorMessage("New password and confirm password do not match")
        setErrorDialogOpen(true)
        return
      }
      const passwordError = validatePassword(editPasswordData.new_password)
      if (passwordError) {
        setErrorMessage(passwordError)
        setErrorDialogOpen(true)
        return
      }
    }

    setIsProcessing(true)
    try {
      // First update profile info
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingUser.id,
          email: editingUser.email,
          full_name: editingUser.full_name,
          position: editingUser.position,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage("Failed to update user: " + data.error)
        setErrorDialogOpen(true)
        return
      }

      // If editing self and password change requested, update password
      if (isEditingSelf && editPasswordData.new_password) {
        const passwordResponse = await fetch('/api/users/password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: editPasswordData.current_password,
            new_password: editPasswordData.new_password,
          }),
        })

        const passwordData = await passwordResponse.json()

        if (!passwordResponse.ok) {
          setErrorMessage("Profile updated but failed to change password: " + passwordData.error)
          setErrorDialogOpen(true)
          setIsEditDialogOpen(false)
          setEditingUser(null)
          setEditPasswordData({ current_password: "", new_password: "", confirm_password: "" })
          fetchUsers()
          return
        }
      }

      // Reset password fields
      setEditPasswordData({ current_password: "", new_password: "", confirm_password: "" })
      setIsEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers()
      toast.success({
        title: "User Updated",
        description: "User has been updated successfully.",
      })
    } catch {
      setErrorMessage("An unexpected error occurred")
      setErrorDialogOpen(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleToggleUserStatus = async () => {
    if (!togglingUser) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: togglingUser.id,
          is_active: !togglingUser.is_active,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage("Failed to update user status: " + data.error)
        setErrorDialogOpen(true)
        return
      }

      setIsToggleDialogOpen(false)
      setTogglingUser(null)
      fetchUsers()
      toast.success({
        title: "Status Updated",
        description: `User has been ${!togglingUser.is_active ? 'enabled' : 'disabled'} successfully.`,
      })
    } catch {
      setErrorMessage("An unexpected error occurred")
      setErrorDialogOpen(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddBankAccount = async () => {
    if (!newBankAccount.name || !newBankAccount.bank_name || !newBankAccount.account_number) return

    setIsSubmittingBank(true)
    try {
      const { error } = await supabase
        .from("bank_accounts")
        .insert({
          name: newBankAccount.name,
          bank_name: newBankAccount.bank_name,
          account_number: newBankAccount.account_number,
        })

      if (error) {
        toast.error({
          title: "Error",
          description: "Failed to create bank account: " + error.message,
        })
        return
      }

      setNewBankAccount({ name: "", bank_name: "", account_number: "" })
      setIsAddBankOpen(false)
      fetchBankAccounts()
      toast.success({
        title: "Bank Account Added",
        description: "Bank account has been created successfully.",
      })
    } catch {
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsSubmittingBank(false)
    }
  }

  const checkBankAccountUsage = async (bankAccountId: string) => {
    const { count, error } = await supabase
      .from("billing_invoices")
      .select("*", { count: "exact", head: true })
      .eq("bank_account_id", bankAccountId)

    if (error) {
      return false
    }

    return (count ?? 0) > 0
  }

  const handleDeleteBankAccount = async () => {
    if (!deletingBankAccount) return

    setIsSubmittingBank(true)
    try {
      // Check if bank account is referenced in billing_invoices
      const inUse = await checkBankAccountUsage(deletingBankAccount.id)
      if (inUse) {
        setBankAccountInUse(true)
        toast.error({
          title: "Cannot Delete",
          description: "This bank account cannot be deleted because it is referenced by one or more invoices.",
        })
        return
      }

      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", deletingBankAccount.id)

      if (error) {
        toast.error({
          title: "Error",
          description: "Failed to delete bank account: " + error.message,
        })
        return
      }

      setIsDeleteBankDialogOpen(false)
      setDeletingBankAccount(null)
      fetchBankAccounts()
      toast.success({
        title: "Bank Account Deleted",
        description: "Bank account has been deleted successfully.",
      })
    } catch {
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsSubmittingBank(false)
    }
  }

  const checkUserUsage = async (userId: string) => {
    // Check all tables that reference auth.users directly
    const checks = await Promise.all([
      // Prepared/approved by references (RESTRICT - blocks deletion)
      supabase.from("billing_invoices").select("*", { count: "exact", head: true }).eq("prepared_by", userId),
      supabase.from("journal_entries").select("*", { count: "exact", head: true }).eq("prepared_by", userId),
      supabase.from("general_vouchers").select("*", { count: "exact", head: true }).eq("prepared_by", userId),
      // Signature tables (will be deleted by trigger)
      supabase.from("invoice_signatures").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("journal_entry_signatures").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("general_voucher_signatures").select("*", { count: "exact", head: true }).eq("user_id", userId),
      // Notifications (will be deleted by trigger)
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId),
    ])

    // Count RESTRICT references that block deletion (prepared_by fields)
    const blockingRefs = (checks[0].count ?? 0) + (checks[1].count ?? 0) + (checks[2].count ?? 0)

    // Count references that will be cleaned up
    const cleanupRefs = checks.slice(3).reduce((sum, check) => sum + (check.count ?? 0), 0)

    return { hasBlockingRefs: blockingRefs > 0, cleanupCount: cleanupRefs }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setIsProcessing(true)
    try {
      // Check if user is referenced anywhere
      const usage = await checkUserUsage(deletingUser.id)
      if (usage.hasBlockingRefs) {
        setUserInUse(true)
        setUserCleanupCount(usage.cleanupCount)
        toast.error({
          title: "Cannot Delete",
          description: "This user cannot be deleted because they are referenced by invoices, journal entries, or vouchers they prepared.",
        })
        return
      }

      // Delete user via API (handles all cleanup)
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: deletingUser.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error({
          title: "Error",
          description: "Failed to delete user: " + (data.error || "Unknown error"),
        })
        return
      }

      setIsDeleteUserDialogOpen(false)
      setDeletingUser(null)
      fetchUsers()
      toast.success({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      })
    } catch {
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  React.useEffect(() => {
    fetchBankAccounts()
    fetchUsers()
    fetchCurrentUser()
  }, [fetchBankAccounts, fetchUsers, fetchCurrentUser])

  const userColumns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: "full_name",
      header: "Full Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("full_name") || "-"}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => row.getValue("position") || "-",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active")
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isActive ? 'Active' : 'Disabled'}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const user = row.original
        const isSelf = user.id === currentUserId

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingUser(user)
                  setIsEditDialogOpen(true)
                }}
              >
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTogglingUser(user)
                  setIsToggleDialogOpen(true)
                }}
                disabled={isSelf}
                className={isSelf ? "opacity-50 cursor-not-allowed" : ""}
              >
                {user.is_active ? (
                  <>
                    <PowerOff className="mr-2 h-4 w-4" />
                    Disable
                  </>
                ) : (
                  <>
                    <Power className="mr-2 h-4 w-4" />
                    Enable
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setDeletingUser(user)
                  setUserInUse(false)
                  setUserCleanupCount(0)
                  setIsDeleteUserDialogOpen(true)
                }}
                disabled={isSelf}
                className={isSelf ? "opacity-50 cursor-not-allowed" : ""}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const columns: ColumnDef<BankAccount>[] = [
    {
      accessorKey: "name",
      header: "Account Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "bank_name",
      header: "Bank Name",
    },
    {
      accessorKey: "account_number",
      header: "Account Number",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const bankAccount = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setDeletingBankAccount(bankAccount)
                  setBankAccountInUse(false)
                  setIsDeleteBankDialogOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: bankAccounts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    state: {
      globalFilter,
      pagination,
    },
  })

  const userTable = useReactTable({
    data: users,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: userFilter,
    },
    onGlobalFilterChange: setUserFilter,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle>My E-Signature</CardTitle>
        </CardHeader>
        <CardContent>
          {currentUserId ? (
            <div className="space-y-4">
              {currentUser?.signature_image ? (
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">
                    Current Active Signature
                  </div>
                  <div className="border rounded-md p-4 bg-white inline-block">
                    <Image
                      src={currentUser.signature_image}
                      alt="Your active signature"
                      width={200}
                      height={128}
                      className="max-h-32 max-w-full object-contain"
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This signature will be used on all official documents and invoices.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4">
                  No signature set. Please add your signature.
                </div>
              )}

              <Dialog open={isSignatureModalOpen} onOpenChange={setIsSignatureModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    {currentUser?.signature_image ? 'Modify Signature' : 'Add Signature'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{currentUser?.signature_image ? 'Update Signature' : 'Add Signature'}</DialogTitle>
                    <DialogDescription>
                      Draw your signature in the area below. Click save when you&apos;re satisfied.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <SignaturePad
                      userId={currentUserId}
                      initialSignature={currentUser?.signature_image}
                      onSignatureSaved={() => {
                        fetchCurrentUser()
                        setIsSignatureModalOpen(false)
                        toast.success({
                          title: "Signature Saved",
                          description: "Your signature has been saved successfully.",
                        })
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <p className="text-muted-foreground">Loading...</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bank Accounts</CardTitle>
          <Dialog open={isAddBankOpen} onOpenChange={setIsAddBankOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bank Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bank Account</DialogTitle>
                <DialogDescription>
                  Add a new bank account for receiving payments.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="bank_name">Bank Name *</Label>
                  <Input
                    id="bank_name"
                    value={newBankAccount.bank_name}
                    onChange={(e) => setNewBankAccount({ ...newBankAccount, bank_name: e.target.value })}
                    placeholder="e.g., BCA, Mandiri, BNI"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_name">Account Name *</Label>
                  <Input
                    id="account_name"
                    value={newBankAccount.name}
                    onChange={(e) => setNewBankAccount({ ...newBankAccount, name: e.target.value })}
                    placeholder="e.g., PT Scholarly Accounting"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="account_number">Account Number *</Label>
                  <Input
                    id="account_number"
                    value={newBankAccount.account_number}
                    onChange={(e) => setNewBankAccount({ ...newBankAccount, account_number: e.target.value })}
                    placeholder="1234567890"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddBankOpen(false)} disabled={isSubmittingBank}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddBankAccount}
                  disabled={!newBankAccount.name || !newBankAccount.bank_name || !newBankAccount.account_number || isSubmittingBank}
                >
                  {isSubmittingBank ? "Adding..." : "Add Bank Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Bank Account Dialog */}
          <Dialog open={isDeleteBankDialogOpen} onOpenChange={setIsDeleteBankDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Bank Account</DialogTitle>
                <DialogDescription>
                  {bankAccountInUse ? (
                    <span className="text-destructive">
                      This bank account cannot be deleted because it is referenced by one or more invoices.
                    </span>
                  ) : (
                    <>
                      Are you sure you want to delete the bank account{" "}
                      <strong>{deletingBankAccount?.name}</strong> ({deletingBankAccount?.bank_name})?
                      <br />
                      <br />
                      This action cannot be undone.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteBankDialogOpen(false)}
                  disabled={isSubmittingBank}
                >
                  {bankAccountInUse ? "Close" : "Cancel"}
                </Button>
                {!bankAccountInUse && (
                  <Button
                    onClick={handleDeleteBankAccount}
                    disabled={isSubmittingBank}
                    variant="destructive"
                  >
                    {isSubmittingBank ? "Deleting..." : "Delete Bank Account"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search bank accounts..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No bank accounts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {table.getRowModel().rows.length} of {bankAccounts.length} bank accounts
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users</CardTitle>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with a secure password.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                    placeholder="e.g., Accountant, Manager"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 5 characters.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm_password">Confirm Password *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={newUser.confirm_password}
                    onChange={(e) => setNewUser({ ...newUser, confirm_password: e.target.value })}
                    placeholder="Confirm password"
                  />
                  {passwordMatchStatus === "mismatch" && (
                    <p className="text-xs text-destructive">Passwords do not match</p>
                  )}
                  {passwordMatchStatus === "matching" && (
                    <p className="text-xs text-green-600">Passwords match</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={
                    !newUser.email ||
                    !newUser.full_name ||
                    !newUser.password ||
                    !newUser.confirm_password ||
                    newUser.password !== newUser.confirm_password ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) {
              setEditPasswordData({ current_password: "", new_password: "", confirm_password: "" })
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_full_name">Full Name *</Label>
                  <Input
                    id="edit_full_name"
                    value={editingUser?.full_name || ""}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, full_name: e.target.value} : null)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_email">Email *</Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={editingUser?.email || ""}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, email: e.target.value} : null)}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_position">Position</Label>
                  <Input
                    id="edit_position"
                    value={editingUser?.position || ""}
                    onChange={(e) => setEditingUser(prev => prev ? {...prev, position: e.target.value} : null)}
                    placeholder="e.g., Accountant, Manager"
                  />
                </div>

                {/* Password Change Section - Only show when editing self */}
                {editingUser?.id === currentUserId && (
                  <>
                    <div className="border-t my-2" />
                    <div className="text-sm font-medium text-muted-foreground">Change Password</div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_current_password">Current Password</Label>
                      <Input
                        id="edit_current_password"
                        type="password"
                        value={editPasswordData.current_password}
                        onChange={(e) => setEditPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_new_password">New Password</Label>
                      <Input
                        id="edit_new_password"
                        type="password"
                        value={editPasswordData.new_password}
                        onChange={(e) => setEditPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                        placeholder="Enter new password"
                      />
                      <p className="text-xs text-muted-foreground">
                        Must be at least 5 characters.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit_confirm_password">Confirm New Password</Label>
                      <Input
                        id="edit_confirm_password"
                        type="password"
                        value={editPasswordData.confirm_password}
                        onChange={(e) => setEditPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                        placeholder="Confirm new password"
                      />
                      {editPasswordMatchStatus === "mismatch" && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                      {editPasswordMatchStatus === "matching" && (
                        <p className="text-xs text-green-600">Passwords match</p>
                      )}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateUser}
                  disabled={
                    !editingUser?.email ||
                    !editingUser?.full_name ||
                    isProcessing ||
                    (editingUser?.id === currentUserId &&
                      !!editPasswordData.new_password &&
                      editPasswordData.new_password !== editPasswordData.confirm_password)
                  }
                >
                  {isProcessing ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Toggle Status Dialog */}
          <Dialog open={isToggleDialogOpen} onOpenChange={setIsToggleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {togglingUser?.is_active ? "Disable User" : "Enable User"}
                </DialogTitle>
                <DialogDescription>
                  Are you sure you want to {togglingUser?.is_active ? "disable" : "enable"} the user{" "}
                  <strong>{togglingUser?.full_name}</strong>?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsToggleDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleToggleUserStatus}
                  disabled={isProcessing}
                  variant={togglingUser?.is_active ? "destructive" : "default"}
                >
                  {isProcessing
                    ? "Processing..."
                    : togglingUser?.is_active
                    ? "Disable User"
                    : "Enable User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete User Dialog */}
          <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete User</DialogTitle>
                <DialogDescription>
                  {userInUse ? (
                    <span className="text-destructive">
                      This user cannot be deleted because they are referenced by invoices, journal entries, or vouchers they prepared.
                      Remove them from those documents first.
                    </span>
                  ) : (
                    <>
                      Are you sure you want to delete the user{" "}
                      <strong>{deletingUser?.full_name}</strong>?
                      <br />
                      <br />
                      This action cannot be undone.
                      {userCleanupCount > 0 && (
                        <>
                          <br />
                          <br />
                          <span className="text-muted-foreground">
                            Note: {userCleanupCount} associated record(s) (signatures, notifications)
                            will also be removed.
                          </span>
                        </>
                      )}
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteUserDialogOpen(false)}
                  disabled={isProcessing}
                >
                  {userInUse ? "Close" : "Cancel"}
                </Button>
                {!userInUse && (
                  <Button
                    onClick={handleDeleteUser}
                    disabled={isProcessing}
                    variant="destructive"
                  >
                    {isProcessing ? "Deleting..." : "Delete User"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Search users..."
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {userTable.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={userColumns.length} className="h-24 text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : userTable.getRowModel().rows?.length ? (
                  userTable.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={userColumns.length} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Error Dialog */}
      <ConfirmDialog
        trigger={null}
        title="Error"
        description={errorMessage}
        confirmText="OK"
        cancelText=""
        open={errorDialogOpen}
        onOpenChange={setErrorDialogOpen}
        onConfirm={() => setErrorDialogOpen(false)}
      />
    </div>
  )
}
