import { createClient } from "jsr:@supabase/supabase-js@2";
import { renderToBuffer } from "npm:@react-pdf/renderer@3.4.0";
import { Resend } from "npm:resend@3.2.0";
import React from "npm:react@18.2.0";
import { InvoicePDF, type InvoiceData } from "./pdf.tsx";
import { DEFAULT_TEMPLATE, renderTemplate } from "./template.ts";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendInvoiceRequest {
  invoice_id: string;
  to: string;
  from?: string;
  reply_to?: string;
  subject?: string;
  body_html?: string;
}

interface BillingInvoiceFromDB {
  id: string;
  invoice_number: string;
  date: string;
  amount_due: number;
  discount: number;
  grand_total: number;
  status: string;
  sent_to_client_at: string | null;
  client: {
    name: string;
    email: string | null;
  } | null;
  items: Array<{
    description: string;
    amount: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    let body: SendInvoiceRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { invoice_id, to, from, reply_to, subject, body_html } = body;

    // Validate required fields
    if (!invoice_id || !to) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: invoice_id, to" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user from JWT
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch invoice with client data and line items
    const { data: invoice, error: invoiceError } = await supabase
      .from("billing_invoices")
      .select(`
        id,
        invoice_number,
        date,
        amount_due,
        discount,
        grand_total,
        status,
        sent_to_client_at,
        client:clients(name, email),
        items:billing_invoice_items(description, amount)
      `)
      .eq("id", invoice_id)
      .eq("created_by", user.id)
      .single();

    if (invoiceError || !invoice) {
      console.error("Invoice fetch error:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const invoiceData = invoice as unknown as BillingInvoiceFromDB;

    // Ensure we have client data
    if (!invoiceData.client) {
      return new Response(
        JSON.stringify({ error: "Invoice has no associated client" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Calculate due date (30 days from invoice date for billing invoices)
    const invoiceDate = new Date(invoiceData.date);
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Build invoice data for PDF
    const pdfData: InvoiceData = {
      number: invoiceData.invoice_number,
      date: invoiceData.date,
      due_date: dueDate.toISOString().split("T")[0],
      customer: {
        name: invoiceData.client.name,
        email: invoiceData.client.email || to,
      },
      company: {
        name: "Scholarly Accounting",
      },
      items: (invoiceData.items || []).map((item) => ({
        description: item.description,
        quantity: 1,
        unit_price: item.amount,
        amount: item.amount,
      })),
      subtotal: invoiceData.grand_total,
      total: invoiceData.amount_due,
    };

    // Generate PDF
    let pdfBuffer: Buffer;
    try {
      const element = React.createElement(InvoicePDF, { data: pdfData });
      pdfBuffer = await renderToBuffer(element);
    } catch (pdfError) {
      console.error("PDF generation error:", pdfError);
      return new Response(
        JSON.stringify({ error: "Failed to generate PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prepare template variables
    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

    const formatDate = (dateStr: string) =>
      new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const templateVars = {
      invoice_number: invoiceData.invoice_number,
      customer_name: invoiceData.client.name,
      amount_due: formatCurrency(invoiceData.amount_due),
      due_date: formatDate(dueDate.toISOString()),
      company_name: "Scholarly Accounting",
      payment_link: `${Deno.env.get("APP_URL") || ""}/billing-invoice/${invoice_id}/pay`,
    };

    // Prepare email content
    const emailFrom = from || DEFAULT_TEMPLATE.from;
    const emailReplyTo = reply_to || DEFAULT_TEMPLATE.replyTo;
    const emailSubject = subject
      ? renderTemplate(subject, templateVars)
      : renderTemplate(DEFAULT_TEMPLATE.subject, templateVars);
    const emailBody = body_html
      ? renderTemplate(body_html, templateVars)
      : renderTemplate(DEFAULT_TEMPLATE.bodyHtml, templateVars);

    // Initialize Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("Missing RESEND_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const resend = new Resend(resendApiKey);

    // Send email with PDF attachment
    const { error: sendError } = await resend.emails.send({
      from: emailFrom,
      to: to,
      reply_to: emailReplyTo,
      subject: emailSubject,
      html: emailBody,
      attachments: [
        {
          filename: `invoice-${invoiceData.invoice_number}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return new Response(
        JSON.stringify({ error: `Failed to send email: ${sendError.message}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Update invoice to mark as sent
    const { error: updateError } = await supabase
      .from("billing_invoices")
      .update({ sent_to_client_at: new Date().toISOString() })
      .eq("id", invoice_id);

    if (updateError) {
      console.error("Failed to update sent_to_client_at:", updateError);
      // Don't fail the request, just log the error
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice sent successfully",
        invoice_number: invoiceData.invoice_number,
        sent_to: to,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
