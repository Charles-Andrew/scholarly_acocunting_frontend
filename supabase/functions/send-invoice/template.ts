// Hardcoded email template for invoice emails

export const DEFAULT_TEMPLATE = {
  from: "info@scholarlyconsulting.co",
  replyTo: "info@scholarlyconsulting.co",
  subject: "Invoice {{invoice_number}} from {{company_name}}",
  bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
    .amount { font-size: 24px; font-weight: bold; color: #000; }
    .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Invoice {{invoice_number}}</h2>
    </div>

    <p>Hi {{customer_name}},</p>

    <p>Please find your invoice attached. Here are the details:</p>

    <p>
      <strong>Invoice Number:</strong> {{invoice_number}}<br>
      <strong>Amount Due:</strong> <span class="amount">{{amount_due}}</span><br>
      <strong>Due Date:</strong> {{due_date}}
    </p>

    <a href="{{payment_link}}" class="button">Pay Now</a>

    <p>Questions about this invoice? Simply reply to this email.</p>

    <div class="footer">
      <p>Thank you for your business,<br>{{company_name}}</p>
    </div>
  </div>
</body>
</html>`,
};

// Simple template variable replacement
export const renderTemplate = (
  template: string,
  variables: Record<string, string>,
): string => {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
};

// Available template variables for UI display
export const TEMPLATE_VARIABLES = [
  { key: "invoice_number", description: "Invoice number (e.g., INV-001)" },
  { key: "customer_name", description: "Customer's full name" },
  { key: "amount_due", description: "Total amount due (formatted)" },
  { key: "due_date", description: "Due date (formatted)" },
  { key: "company_name", description: "Your company name" },
  { key: "payment_link", description: "Link to payment page" },
];
