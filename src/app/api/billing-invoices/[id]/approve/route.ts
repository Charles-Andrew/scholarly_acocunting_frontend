import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch the invoice
  const { data: invoice, error: fetchError } = await supabase
    .from("billing_invoices")
    .select("approved_by, status")
    .eq("id", resolvedParams.id)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  // Check authorization: only the assigned approver can approve
  if (invoice.approved_by !== user.id) {
    return NextResponse.json(
      { error: "You are not authorized to approve this invoice" },
      { status: 403 }
    )
  }

  // Check status: only invoices with "for_approval" status can be approved
  if (invoice.status !== "for_approval") {
    return NextResponse.json(
      { error: "Invoice is not pending approval" },
      { status: 400 }
    )
  }

  // Approve the invoice
  const { error: updateError } = await supabase
    .from("billing_invoices")
    .update({
      status: "approved",
    })
    .eq("id", resolvedParams.id)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to approve invoice" },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, message: "Invoice approved successfully" })
}
