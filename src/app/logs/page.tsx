import { createClient } from "@/lib/supabase/server"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

type ActivityLog = {
  id: string
  user_name: string
  action: string
  description: string
  resource_type: string | null
  resource_id: string | null
  created_at: string
}

export default async function LogsPage() {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching logs:", error)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Activity Logs</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Resource</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No activity logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log: ActivityLog) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>{log.user_name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.description}</TableCell>
                      <TableCell>
                        {log.resource_type && (
                          <span className="text-muted-foreground">
                            {log.resource_type}
                            {log.resource_id && ` (${log.resource_id.slice(0, 8)}...)`}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
