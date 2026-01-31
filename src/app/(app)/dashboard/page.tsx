import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  DollarSign,
  FileText,
  CheckCircle,
  TrendingUp
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency, formatDate } from "@/lib/utils"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { Badge } from "@/components/ui/badge"
import type { RecentInvoice, CategoryWithInvoices, RevenueInvoiceRef } from "@/lib/types/dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch dashboard data
  const [
    invoiceStats,
    categoryRevenue,
    recentInvoices,
    clients
  ] = await Promise.all([
    // Invoice statistics
    supabase
      .from("billing_invoices")
      .select("status, amount_due, grand_total, signed")
      .then(({ data }) => {
        const stats = {
          total: data?.length || 0,
          draft: 0,
          pending: 0,
          approved: 0,
          totalReceivables: 0,
          signed: 0
        }
        data?.forEach(inv => {
          if (inv.status === 'draft') stats.draft++
          if (inv.status === 'for_approval') stats.pending++
          if (inv.status === 'approved') {
            stats.approved++
            stats.totalReceivables += parseFloat(inv.amount_due || 0)
          }
          if (inv.signed) stats.signed++
        })
        return stats
      }),

    // Revenue by category
    supabase
      .from("income_categories")
      .select("name, slug, billing_invoices!left(id, grand_total, status)")
      .then(({ data }) => {
        return data?.map((cat: CategoryWithInvoices) => ({
          name: cat.name,
          value: cat.billing_invoices
            ?.filter((inv: RevenueInvoiceRef) => inv.status === 'approved')
            ?.reduce((sum: number, inv: RevenueInvoiceRef) => sum + parseFloat(String(inv.grand_total || 0)), 0) || 0,
          count: cat.billing_invoices?.filter((inv: RevenueInvoiceRef) => inv.status === 'approved')?.length || 0
        })).filter((cat: {name: string, value: number, count: number}) => cat.value > 0) || []
      }),

    // Recent invoices
    supabase
      .from("billing_invoices")
      .select("id, invoice_number, date, amount_due, status, grand_total, signed, clients:client_id(name)")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => (data as unknown as RecentInvoice[]) || []),

    // Clients
    supabase
      .from("clients")
      .select("id")
      .then(({ data }) => data?.length || 0)
  ])

  // Calculate derived metrics
  const totalInvoices = invoiceStats.total
  const approvedInvoices = invoiceStats.approved
  const signedPercentage = totalInvoices > 0 ? Math.round((invoiceStats.signed / totalInvoices) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Last updated: {formatDate(new Date())}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(invoiceStats.totalReceivables)}</div>
            <p className="text-xs text-muted-foreground">
              {approvedInvoices} approved invoice{approvedInvoices !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients}</div>
            <p className="text-xs text-muted-foreground">
              Active accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {invoiceStats.draft > 0 && <span>{invoiceStats.draft} draft</span>}
              {invoiceStats.pending > 0 && <span>{invoiceStats.pending} pending</span>}
              {invoiceStats.draft === 0 && invoiceStats.pending === 0 && (
                <span>All approved</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Signed Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signedPercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {invoiceStats.signed} of {totalInvoices} signed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue by Category Chart */}
        <Card className="col-span-7">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={categoryRevenue} />
          </CardContent>
        </Card>

      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Invoice #</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 rounded-tr-lg">Signed</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice: RecentInvoice) => (
                  <tr key={invoice.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3 font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.clients?.name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(invoice.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        invoice.status === 'approved' ? 'default' :
                        invoice.status === 'for_approval' ? 'secondary' :
                        'outline'
                      }>
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(parseFloat(String(invoice.grand_total || 0)))}
                    </td>
                    <td className="px-4 py-3">
                      {invoice.signed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {recentInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
