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
import { ChevronLeft, ChevronRight, Plus, Edit2, Power, PowerOff, MoreHorizontal } from "lucide-react"
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
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isToggleDialogOpen, setIsToggleDialogOpen] = React.useState(false)
  const [togglingUser, setTogglingUser] = React.useState<UserProfile | null>(null)
  const [isProcessing, setIsProcessing] = React.useState(false)

  const supabase = createClient()

  const fetchBankAccounts = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
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

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) return

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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert("Failed to create user: " + data.error)
        return
      }

      // Reset form and refresh users
      setNewUser({ email: "", full_name: "", position: "" })
      setIsAddUserOpen(false)
      fetchUsers()
    } catch {
      alert("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser || !editingUser.email || !editingUser.full_name) return

    setIsProcessing(true)
    try {
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
        alert("Failed to update user: " + data.error)
        return
      }

      setIsEditDialogOpen(false)
      setEditingUser(null)
      fetchUsers()
      toast.success({
        title: "User Updated",
        description: "User has been updated successfully.",
      })
    } catch {
      alert("An unexpected error occurred")
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
        alert("Failed to update user status: " + data.error)
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
      alert("An unexpected error occurred")
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
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
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
                  Create a new user account. They will receive a temporary password via email.
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser} disabled={!newUser.email || !newUser.full_name || isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUser} disabled={!editingUser?.email || !editingUser?.full_name || isProcessing}>
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
    </div>
  )
}
