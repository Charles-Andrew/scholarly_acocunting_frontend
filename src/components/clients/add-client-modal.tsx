"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Plus } from "lucide-react"
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
import { toast } from "@/hooks/use-toast"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  accounts_receivable_code: z.string(),
})

type FormValues = z.infer<typeof formSchema>

interface AddClientModalProps {
  onClientAdded?: () => void
}

export function AddClientModal({ onClientAdded }: AddClientModalProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const supabase = createClient()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      accounts_receivable_code: "",
    },
  })

  const nameValue = form.watch("name")
  const [debouncedName] = useDebounce(nameValue, 300)

  React.useEffect(() => {
    const normalizedName = debouncedName.trim().replace(/\s+/g, " ").toUpperCase()
    if (normalizedName) {
      const arCode = `A/R - ${normalizedName}`
      form.setValue("accounts_receivable_code", arCode, { shouldValidate: true })
    } else {
      form.setValue("accounts_receivable_code", "", { shouldValidate: true })
    }
  }, [debouncedName, form])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      const { error } = await supabase.from("clients").insert({
        name: values.name,
        email: values.email,
        accounts_receivable_code: values.accounts_receivable_code,
      })

      if (error) {
        toast.error({
          title: "Error",
          description: "Failed to create client. Please try again.",
        })
        return
      }

      toast.success({
        title: "Client Created",
        description: `${values.name} has been added successfully.`,
      })
      setOpen(false)
      form.reset()
      onClientAdded?.()
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
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
          <DialogDescription>
            Create a new client. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <Input placeholder="Auto-generated" {...field} readOnly />
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
