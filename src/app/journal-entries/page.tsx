import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function JournalEntriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Journal Entries</h1>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Journal entries page - UI coming soon.</p>
        </CardContent>
      </Card>
    </div>
  )
}
