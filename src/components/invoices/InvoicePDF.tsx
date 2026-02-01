"use client"

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"
import type { LineItem } from "@/lib/types/invoice"

interface InvoicePDFData {
  invoice_number: string
  date: string
  amount_due: number
  discount: number
  grand_total: number
  client_name: string
  client_email?: string
  items: LineItem[]
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 10,
    color: "#666",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#666",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerDetails: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  datesRow: {
    flexDirection: "row",
    gap: 40,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  table: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
  },
  tableRowEven: {
    backgroundColor: "#f9f9f9",
  },
  colDescription: {
    flex: 4,
  },
  colAmount: {
    flex: 1.5,
    textAlign: "right",
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
    textTransform: "uppercase",
  },
  tableCell: {
    fontSize: 10,
  },
  totals: {
    marginTop: 24,
    alignItems: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: "row",
    marginBottom: 4,
    minWidth: 200,
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
  },
  totalValue: {
    fontSize: 10,
    width: 100,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: "#333",
    minWidth: 200,
    justifyContent: "space-between",
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    width: 100,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
  },
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Calculate due date (30 days from invoice date)
function getDueDate(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + 30)
  return date.toISOString().split("T")[0]
}

interface InvoicePDFProps {
  data: InvoicePDFData
}

export function InvoicePDFDocument({ data }: InvoicePDFProps) {
  const dueDate = getDueDate(data.date)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>Scholarly Accounting</Text>
            <Text style={styles.companyDetails}>scholarly@example.com</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{data.invoice_number}</Text>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          <Text style={styles.customerName}>{data.client_name}</Text>
          {data.client_email && (
            <Text style={styles.customerDetails}>{data.client_email}</Text>
          )}
        </View>

        {/* Dates */}
        <View style={[styles.section, styles.datesRow]}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Invoice Date</Text>
            <Text style={styles.dateValue}>{formatDate(data.date)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Due Date</Text>
            <Text style={styles.dateValue}>{formatDate(dueDate)}</Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>

          {data.items.map((item, index) => (
            <View
              key={item.id || index}
              style={[
                styles.tableRow,
                ...(index % 2 === 1 ? [styles.tableRowEven] : []),
              ]}
            >
              <Text style={[styles.tableCell, styles.colDescription]}>
                {item.description}
              </Text>
              <Text style={[styles.tableCell, styles.colAmount]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(data.grand_total)}
            </Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={styles.totalValue}>
                -{formatCurrency(data.discount)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Amount Due</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(data.amount_due)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Thank you for your business!</Text>
      </Page>
    </Document>
  )
}
