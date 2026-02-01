/** @jsxImportSource npm:react@18.2.0 */
/** @jsxRuntime automatic */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  Image,
} from "npm:@react-pdf/renderer@3.4.0";
import React from "npm:react@18.2.0";

// Types matching the frontend InvoicePDF
interface LineItem {
  id?: string;
  description: string;
  amount: number;
}

interface BankAccount {
  name?: string;
  bank_name?: string;
  account_number?: string;
}

interface SignatureData {
  full_name?: string;
  email?: string;
  position?: string;
}

interface SignatureImage {
  signature_image: string;
  signed_at: string;
}

interface InvoicePDFData {
  invoice_number: string;
  date: string;
  amount_due: number;
  discount: number;
  grand_total: number;
  client_name: string;
  client_email?: string;
  items: LineItem[];
  bank_account?: BankAccount | null;
  prepared_by?: SignatureData | null;
  approved_by?: SignatureData | null;
  prepared_by_signature?: SignatureImage | null;
  approved_by_signature?: SignatureImage | null;
}

const LOGO_URL = "https://gjrdshqnjalyivzeciyu.supabase.co/storage/v1/object/public/company-logos/scholarly_logo.png";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  // Section 1: Logo
  logoSection: {
    padding: 32,
    paddingBottom: 16,
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 60,
    objectFit: "contain",
    marginBottom: 8,
  },
  companyAddress: {
    fontSize: 10,
    color: "#4B5563",
  },
  // Section 2: Title
  titleSection: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827",
    letterSpacing: 1,
  },
  // Section 3: Bill To and Invoice Number
  headerSection: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  billToSection: {
    flex: 1,
  },
  invoiceNumberSection: {
    flex: 1,
    alignItems: "flex-end",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 12,
    color: "#111827",
  },
  // Section 4: Table
  tableSection: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#9CA3AF",
    paddingVertical: 10,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    fontSize: 11,
    color: "#111827",
  },
  colDate: {
    width: "25%",
    paddingHorizontal: 8,
  },
  colDescription: {
    flex: 1,
    paddingHorizontal: 8,
  },
  colAmount: {
    width: "25%",
    paddingHorizontal: 8,
    textAlign: "right",
  },
  // Section 5: Totals
  totalsSection: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: "flex-end",
  },
  totalsContainer: {
    width: 250,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "medium",
  },
  totalValue: {
    fontSize: 11,
    color: "#111827",
  },
  finalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#9CA3AF",
  },
  finalTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  finalTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  // Section 6: Mode of Payment
  paymentSection: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  paymentLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  paymentRowLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    width: 120,
  },
  paymentRowValue: {
    fontSize: 11,
    color: "#111827",
  },
  // Section 7: Signatures
  signaturesSection: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    flexDirection: "row",
    gap: 32,
  },
  signatureBlock: {
    flex: 1,
    maxWidth: 250,
  },
  signatureLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  signatureImageContainer: {
    height: 48,
    marginBottom: -16,
  },
  signatureImage: {
    height: 48,
    width: 150,
    objectFit: "contain",
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 4,
    marginBottom: 4,
  },
  signaturePosition: {
    fontSize: 10,
    color: "#4B5563",
  },
  // Section 8: Footer
  footerSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    color: "#374151",
  },
  footerCenter: {
    fontSize: 10,
    color: "#374151",
  },
});

function formatCurrency(value: number): string {
  return `PHP ${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface InvoicePDFProps {
  data: InvoicePDFData;
}

function InvoicePDF({ data }: InvoicePDFProps) {
  const hasBankAccount = data.bank_account && (
    data.bank_account.name ||
    data.bank_account.bank_name ||
    data.bank_account.account_number
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Section 1: Company Logo */}
        <View style={styles.logoSection}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
          <Image src={LOGO_URL} style={styles.logo} />
          <Text style={styles.companyAddress}>Alim St., Kidapawan City</Text>
        </View>

        {/* Section 2: BILLING INVOICE Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>BILLING INVOICE</Text>
        </View>

        {/* Section 3: Bill To and Invoice Number */}
        <View style={styles.headerSection}>
          <View style={styles.billToSection}>
            <Text style={styles.sectionLabel}>Bill To:</Text>
            <Text style={styles.sectionValue}>{data.client_name || "-"}</Text>
          </View>
          <View style={styles.invoiceNumberSection}>
            <Text style={styles.sectionLabel}>Invoice Number:</Text>
            <Text style={styles.sectionValue}>{data.invoice_number}</Text>
          </View>
        </View>

        {/* Section 4: Line Items Table */}
        <View style={styles.tableSection}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDate]}>Date</Text>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Amount</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={item.id || index} style={styles.tableRow}>
              <Text style={[styles.tableCell, styles.colDate]}>{formatDate(data.date)}</Text>
              <Text style={[styles.tableCell, styles.colDescription]}>{item.description}</Text>
              <Text style={[styles.tableCell, styles.colAmount]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Section 5: Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(data.grand_total)}</Text>
            </View>
            {data.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={styles.totalValue}>-{formatCurrency(data.discount)}</Text>
              </View>
            )}
            <View style={styles.finalTotalRow}>
              <Text style={styles.finalTotalLabel}>Total</Text>
              <Text style={styles.finalTotalValue}>{formatCurrency(data.amount_due)}</Text>
            </View>
          </View>
        </View>

        {/* Section 6: Mode of Payment */}
        {hasBankAccount && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>Mode of Payment</Text>
            {data.bank_account?.name && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentRowLabel}>Account Name:</Text>
                <Text style={styles.paymentRowValue}>{data.bank_account.name}</Text>
              </View>
            )}
            {data.bank_account?.bank_name && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentRowLabel}>Bank Name:</Text>
                <Text style={styles.paymentRowValue}>{data.bank_account.bank_name}</Text>
              </View>
            )}
            {data.bank_account?.account_number && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentRowLabel}>Account Number:</Text>
                <Text style={styles.paymentRowValue}>{data.bank_account.account_number}</Text>
              </View>
            )}
          </View>
        )}

        {/* Section 7: Prepared By and Approved By */}
        <View style={styles.signaturesSection}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Prepared by:</Text>
            {data.prepared_by_signature?.signature_image && (
              <View style={styles.signatureImageContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
                <Image
                  src={data.prepared_by_signature.signature_image}
                  style={styles.signatureImage}
                />
              </View>
            )}
            <Text style={styles.signatureName}>
              {data.prepared_by?.full_name || data.prepared_by?.email || "-"}
            </Text>
            {data.prepared_by?.position && (
              <Text style={styles.signaturePosition}>{data.prepared_by.position}</Text>
            )}
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Approved by:</Text>
            {data.approved_by_signature?.signature_image && (
              <View style={styles.signatureImageContainer}>
                {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
                <Image
                  src={data.approved_by_signature.signature_image}
                  style={styles.signatureImage}
                />
              </View>
            )}
            <Text style={styles.signatureName}>
              {data.approved_by?.full_name || data.approved_by?.email || "-"}
            </Text>
            {data.approved_by?.position && (
              <Text style={styles.signaturePosition}>{data.approved_by.position}</Text>
            )}
          </View>
        </View>

        {/* Section 8: Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.footerText}>0910-027-7571 // 0966-167-4592</Text>
          <Text style={styles.footerCenter}>scholarlyconsulting.co</Text>
          <Text style={styles.footerText}>info@scholarlyconsulting.co</Text>
        </View>
      </Page>
    </Document>
  );
}

export { InvoicePDF };
export type { InvoicePDFData, LineItem, BankAccount, SignatureData, SignatureImage };
