"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Label } from "@/components/ui/label"

interface SignaturePreviewProps {
  userId: string
  userName: string
  role: "Prepared By" | "Approved By"
}

export function SignaturePreview({ userId, userName, role }: SignaturePreviewProps) {
  const [signature, setSignature] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchSignature = async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("signature_image")
        .eq("id", userId)
        .single()
      setSignature(data?.signature_image || null)
    }
    fetchSignature()
  }, [supabase, userId])

  return (
    <div className="text-center">
      {signature ? (
        <img src={signature} alt="Signature" className="max-h-20 mx-auto" />
      ) : (
        <div className="h-20 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded">
          No signature set
        </div>
      )}
      <p className="text-sm mt-1">{userName}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  )
}
