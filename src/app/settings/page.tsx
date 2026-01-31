"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
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

  const supabase = createClient()

  const fetchBankAccounts = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching bank accounts:", error)
        return
      }

      setBankAccounts(data || [])
    } catch (error) {
      console.error("Error fetching bank accounts:", error)
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
        console.error("Error fetching users:", error)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error("Error fetching users:", error)
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
          console.error("Error fetching current user:", error)
        } else {
          setCurrentUser(data)
        }
      }
    } catch (error) {
      console.error("Error fetching current user:", error)
    }
  }, [supabase])

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name) return

    setIsSubmitting(true)
    try {
      // First create the user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: "password123",
        email_confirm: true,
        user_metadata: {
          full_name: newUser.full_name,
        },
      })

      if (authError) {
        console.error("Error creating auth user:", authError)
        alert("Failed to create user: " + authError.message)
        return
      }

      if (authData.user) {
        // Then create the profile
        const { error: profileError } = await supabase
          .from("user_profiles")
          .insert({
            id: authData.user.id,
            email: newUser.email,
            full_name: newUser.full_name,
            position: newUser.position || null,
          })

        if (profileError) {
          console.error("Error creating user profile:", profileError)
          alert("Failed to create user profile: " + profileError.message)
          return
        }

        // Reset form and refresh users
        setNewUser({ email: "", full_name: "", position: "" })
        setIsAddUserOpen(false)
        fetchUsers()
      }
    } catch (error) {
      console.error("Error adding user:", error)
      alert("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
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
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => {
        const date = new Date(row.getValue("updated_at"))
        return date.toLocaleDateString()
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
                    <img
                      src={currentUser.signature_image}
                      alt="Your active signature"
                      className="max-h-32 max-w-full object-contain"
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
