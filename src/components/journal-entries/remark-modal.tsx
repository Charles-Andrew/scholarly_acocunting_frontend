"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquarePlus, MessageSquare } from "lucide-react"

interface RemarkModalProps {
  category: string
  existingRemark?: string
  onSave: (remark: string) => void
  disabled?: boolean
}

export function RemarkModal({
  category,
  existingRemark,
  onSave,
  disabled = false,
}: RemarkModalProps) {
  const [open, setOpen] = React.useState(false)
  const [remark, setRemark] = React.useState(existingRemark || "")
  const [isSaving, setIsSaving] = React.useState(false)

  // Update remark when existingRemark changes (e.g., when state updates)
  React.useEffect(() => {
    setRemark(existingRemark || "")
  }, [existingRemark, open])

  const hasExistingRemark = existingRemark && existingRemark.trim() !== ""

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(remark)
      setOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setRemark(existingRemark || "")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={hasExistingRemark ? "outline" : "ghost"}
          size="sm"
          disabled={disabled}
          className="h-7 px-2 text-xs"
        >
          {hasExistingRemark ? (
            <>
              <MessageSquare className="mr-1 h-3 w-3" />
              Edit Remark
            </>
          ) : (
            <>
              <MessageSquarePlus className="mr-1 h-3 w-3" />
              Add Remark
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasExistingRemark ? "Edit Remark" : "Add Remark"}
          </DialogTitle>
          <DialogDescription>
            {hasExistingRemark
              ? `Update the remark for category "${category}"`
              : `Add a remark for category "${category}"`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your remark here..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {remark.length}/500 characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Remark"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
