const nodemailer = require('nodemailer');

// Create transporter — use Gmail SMTP or fallback to ethereal (dev mode)
let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Real Gmail SMTP
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  } else {
    // Dev fallback: Ethereal (auto-creates a test account)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Dev email account:', testAccount.user);
  }
  return transporter;
}

async function sendEmail({ to, bcc, subject, html }) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: `"Bharat Sevak" <${process.env.EMAIL_USER || 'noreply@bharatsevak.in'}>`,
    to,
    bcc,
    subject,
    html,
  });
  if (!process.env.EMAIL_USER) {
    console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
  }
  return info;
}

async function sendComplaintEmail({ to, subject, html }) {
  try {
    return await sendEmail({ to, subject, html });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function messageEmailHtml({ title, message, recipientName }) {
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>');
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#F8FAFC;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B00,#CC5500);padding:24px 32px;">
        <h1 style="margin:0;font-size:22px;">🇮🇳 Bharat Sevak</h1>
        <p style="margin:4px 0 0;opacity:.85;font-size:14px;">Official platform notification</p>
      </div>
      <div style="padding:28px 32px;">
        ${recipientName ? `<p style="margin:0 0 14px;font-size:15px;">Hello ${escapeHtml(recipientName)},</p>` : ''}
        <h2 style="font-size:19px;margin:0 0 14px;">${safeTitle}</h2>
        <div style="padding:16px;background:#1E293B;border-radius:8px;line-height:1.7;font-size:14px;">${safeMessage}</div>
        <p style="margin-top:24px;font-size:12px;color:#64748B;">This message was sent by Bharat Sevak administration.</p>
      </div>
    </div>
  `;
}

function providerQueryEmailHtml({ queryId, providerName, providerEmail, subject, details, adminReply, status }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#F8FAFC;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B00,#CC5500);padding:24px 32px;">
        <h1 style="margin:0;font-size:22px;">🇮🇳 Bharat Sevak — Provider Support</h1>
        <p style="margin:4px 0 0;opacity:.85;font-size:14px;">Provider query update</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#94A3B8;width:150px;">Query ID</td><td style="padding:8px 0;font-weight:700;color:#FF6B00;">${escapeHtml(queryId)}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;">Provider</td><td style="padding:8px 0;">${escapeHtml(providerName)} (${escapeHtml(providerEmail)})</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;">Status</td><td style="padding:8px 0;text-transform:capitalize;">${escapeHtml(status).replace(/_/g, ' ')}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;">Subject</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(subject)}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#1E293B;border-radius:8px;border-left:4px solid #FF6B00;">
          <div style="color:#94A3B8;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Provider Query</div>
          <p style="margin:0;line-height:1.7;font-size:14px;">${escapeHtml(details).replace(/\n/g, '<br>')}</p>
        </div>
        ${adminReply ? `
          <div style="margin-top:16px;padding:16px;background:#064E3B;border-radius:8px;border-left:4px solid #10B981;">
            <div style="color:#6EE7B7;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Admin Response</div>
            <p style="margin:0;line-height:1.7;font-size:14px;">${escapeHtml(adminReply).replace(/\n/g, '<br>')}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function complaintEmailHtml({ complaintId, complaintType, subject, details, orderId, customerName, customerEmail, providerName }) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0F172A;color:#F8FAFC;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#FF6B00,#CC5500);padding:24px 32px;">
        <h1 style="margin:0;font-size:22px;">🇮🇳 Bharat Sevak — Grievance Report</h1>
        <p style="margin:4px 0 0;opacity:0.85;font-size:14px;">A new complaint has been filed on the platform</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#94A3B8;width:180px;">Complaint ID</td><td style="padding:8px 0;font-weight:700;color:#FF6B00;">${complaintId}</td></tr>
          ${orderId ? `<tr><td style="padding:8px 0;color:#94A3B8;">Order ID</td><td style="padding:8px 0;font-weight:600;">${orderId}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#94A3B8;">Customer</td><td style="padding:8px 0;">${customerName} (${customerEmail})</td></tr>
          ${providerName ? `<tr><td style="padding:8px 0;color:#94A3B8;">Provider</td><td style="padding:8px 0;">${providerName}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#94A3B8;">Type</td><td style="padding:8px 0;text-transform:capitalize;">${complaintType.replace(/_/g,' ')}</td></tr>
          <tr><td style="padding:8px 0;color:#94A3B8;">Subject</td><td style="padding:8px 0;font-weight:600;">${subject}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#1E293B;border-radius:8px;border-left:4px solid #FF6B00;">
          <div style="color:#94A3B8;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Complaint Details</div>
          <p style="margin:0;line-height:1.7;font-size:14px;">${details.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin-top:24px;font-size:13px;color:#64748B;">Please log in to the Bharat Sevak admin panel to review and resolve this complaint promptly.</p>
      </div>
      <div style="padding:16px 32px;background:#1E293B;text-align:center;font-size:12px;color:#64748B;">
        © ${new Date().getFullYear()} Bharat Sevak — Serving the Nation 🇮🇳
      </div>
    </div>
  `;
}

module.exports = { sendEmail, sendComplaintEmail, complaintEmailHtml, messageEmailHtml, providerQueryEmailHtml };
