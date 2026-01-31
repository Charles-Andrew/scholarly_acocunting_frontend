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

  // Get signature type from request body
  const { signatureType } = await request.json()

  if (!signatureType || !["prepared_by", "approved_by"].includes(signatureType)) {
    return NextResponse.json(
      { error: "Invalid signature type. Must be 'prepared_by' or 'approved_by'" },
      { status: 400 }
    )
  }

  // Fetch the invoice to verify user is authorized
  const { data: invoice, error: fetchError } = await supabase
    .from("billing_invoices")
    .select("prepared_by, approved_by, status")
    .eq("id", resolvedParams.id)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  // Verify user is the correct person for this signature type
  if (signatureType === "prepared_by" && invoice.prepared_by !== user.id) {
    return NextResponse.json(
      { error: "Only the preparer can add their signature" },
      { status: 403 }
    )
  }

  if (signatureType === "approved_by" && invoice.approved_by !== user.id) {
    return NextResponse.json(
      { error: "Only the assigned approver can add their signature" },
      { status: 403 }
    )
  }

  // Get user's signature image
  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("signature_image")
    .eq("id", user.id)
    .single()

  if (profileError || !userProfile?.signature_image) {
    return NextResponse.json(
      { error: "No signature image found for your account" },
      { status: 400 }
    )
  }

  // Check if signature already exists
  const { data: existingSignature } = await supabase
    .from("invoice_signatures")
    .select("id")
    .eq("invoice_id", resolvedParams.id)
    .eq("signature_type", signatureType)
    .single()

  if (existingSignature) {
    return NextResponse.json(
      { error: "Signature already exists for this role" },
      { status: 409 }
    )
  }

  // Create the signature
  const { error: insertError } = await supabase.from("invoice_signatures").insert({
    invoice_id: resolvedParams.id,
    user_id: user.id,
    signature_type: signatureType,
    signature_image: userProfile.signature_image,
  })

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to add signature" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Signature added successfully",
  })
}

export async function DELETE(
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

  // Get signature type from request body
  const { signatureType } = await request.json()

  if (!signatureType || !["prepared_by", "approved_by"].includes(signatureType)) {
    return NextResponse.json(
      { error: "Invalid signature type. Must be 'prepared_by' or 'approved_by'" },
      { status: 400 }
    )
  }

  // Delete the signature
  const { error: deleteError } = await supabase
    .from("invoice_signatures")
    .delete()
    .eq("invoice_id", resolvedParams.id)
    .eq("signature_type", signatureType)
    .eq("user_id", user.id)

  if (deleteError) {
    return NextResponse.json(
      { error: "Failed to remove signature" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Signature removed successfully",
  })
}
