import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Get current user to verify authorization
    const supabase = await createClient()
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { current_password, new_password } = body

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (new_password.length < 5) {
      return NextResponse.json(
        { error: "New password must be at least 5 characters long" },
        { status: 400 }
      )
    }

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentUser.email!,
      password: current_password,
    })

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update password: " + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    })
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
