"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Pencil } from "lucide-react"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import type { Client } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const formSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  accounts_receivable_code: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface EditClientModalProps {
  client: Client
  onClientUpdated: () => void
  children?: React.ReactNode
}

export function EditClientModal({ client, onClientUpdated, children }: EditClientModalProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: client.id,
      name: client.name,
      email: client.email,
      accounts_receivable_code: client.accounts_receivable_code || "",
    },
  })

  const nameValue = form.watch("name")
  const [debouncedName] = useDebounce(nameValue, 300)

  React.useEffect(() => {
    if (debouncedName) {
      const arCode = `A/R-${debouncedName.replace(/\s+/g, "-").toUpperCase()}`
      form.setValue("accounts_receivable_code", arCode, { shouldValidate: true })
    } else {
      form.setValue("accounts_receivable_code", "", { shouldValidate: true })
    }
  }, [debouncedName, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: values.name,
          email: values.email,
          accounts_receivable_code: values.accounts_receivable_code,
        })
        .eq("id", values.id)

      if (error) {
        toast.error({
          title: "Error",
          description: "Failed to update client. Please try again.",
        })
        return
      }

      toast.success({
        title: "Client Updated",
        description: `${values.name} has been updated successfully.`,
      })
      setOpen(false)
      onClientUpdated()
    } catch {
      toast.error({
        title: "Error",
        description: "An unexpected error occurred.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input type="hidden" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="client@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accounts_receivable_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>A/R (Accounts Receivable)</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly className="bg-muted" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
