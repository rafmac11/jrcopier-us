const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIGURATION ───────────────────────────────────────────────
let resend;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY || 'missing_key');
  }
  return resend;
}

// CRM Webhook config
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL;
const CRM_API_KEY = process.env.CRM_API_KEY;

// Email recipients (comma-separated in env var, or defaults)
function getRecipients() {
  if (process.env.EMAIL_RECIPIENTS) {
    return process.env.EMAIL_RECIPIENTS.split(',').map((e) => e.trim());
  }
  return ['rafael@jrcopier.com'];
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'JR Copier <noreply@webleadsnow.com>';

// Allow embedding from any origin
app.use(cors());
app.use(express.json());

// Allow iframe embedding from any domain
app.use((req, res, next) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Label mappings ──────────────────────────────────────────────
const usageLabels = {
  commercial: 'Commercial Business',
  'home-based': 'Home-Based Business',
  personal: 'Personal (Non-Business)',
};

const printerTypeLabels = {
  floor: 'Floor-Standing Model',
  desktop: 'Desktop Model',
  managed: 'Managed Print Services',
};

// ─── 360Connect field mappings ───────────────────────────────────
const usage360Labels = {
  commercial:  'Commercial business',
  'home-based': 'Home-based business',
  personal:    'Personal (non-business use)',
};

const printerType360Labels = {
  floor:   'Floor-standing model',
  desktop: 'Desktop model',
  managed: 'Managed print services',
};

const LEADCONDUIT_URL =
  'https://app.leadconduit.com/flows/56f43aaa2de2a66e7b86c529/sources/5e3b1a0a1814651655cf75ef/submit';
const CAMPAIGN_ID = '4801c0f2-8be5-42fa-e23b-08de73da420a';

// ─── Post directly to 360Connect LeadConduit ────────────────────
async function sendTo360Connect(formData) {
  const nameParts = (formData.fullname || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || firstName;

  const payload = new URLSearchParams({
    affiliate_campaign_id_360: CAMPAIGN_ID,
    category_name_360:         'Commercial Copiers',
    first_name:                firstName,
    last_name:                 lastName,
    company_name_360:          formData.company || '',
    phone_1:                   formData.phone   || '',
    email:                     formData.email   || '',
    install_postal_code_360:   formData.zip     || '',
    answer1_text_360:          usage360Labels[formData.usage]        || formData.usage        || '',
    answer2_text_360:          printerType360Labels[formData.printerType] || formData.printerType || '',
    trustedform_cert_url:      formData.trustedformCertUrl || '',
  });

  const response = await fetch(LEADCONDUIT_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    payload.toString(),
  });

  const text = await response.text();
  console.log('360Connect response:', response.status, text);

  if (!response.ok) {
    throw new Error(`360Connect error: ${response.status} — ${text}`);
  }

  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ─── Send to CRM Webhook ────────────────────────────────────────
async function sendToCRM(formData) {
  if (!CRM_WEBHOOK_URL || !CRM_API_KEY) {
    throw new Error('CRM webhook not configured');
  }

  const nameParts = (formData.fullname || '').trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || firstName;

  const payload = {
    form_id: process.env.CRM_FORM_ID || '',
    source: 'jr-copier-quote-form',
    lead: {
      // Standard fields
      name:         formData.fullname || '',
      email:        formData.email   || '',
      phone:        formData.phone   || '',
      company:      formData.company || '',
      zip_code:     formData.zip     || '',
      usage_type:   usageLabels[formData.usage]             || formData.usage       || '',
      printer_type: printerTypeLabels[formData.printerType] || formData.printerType || '',
      page_url:     formData.pageUrl || '',

      // 360Connect required fields
      first_name:                firstName,
      last_name:                 lastName,
      company_name_360:          formData.company || '',
      phone_1:                   formData.phone   || '',
      install_postal_code_360:   formData.zip     || '',
      category_name_360:         'Commercial Copiers',
      affiliate_campaign_id_360: '4801c0f2-8be5-42fa-e23b-08de73da420a',
      answer1_text_360:          usage360Labels[formData.usage]             || formData.usage       || '',
      answer2_text_360:          printerType360Labels[formData.printerType] || formData.printerType || '',
      trustedform_cert_url:      formData.trustedformCertUrl || '',
    },
  };

  const response = await fetch(CRM_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CRM_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`CRM webhook error: ${response.status} — ${errBody}`);
  }

  return await response.json();
}

// ─── Build HTML email ────────────────────────────────────────────
function buildEmailHtml(formData) {
  const row = (label, value) =>
    value
      ? `<tr>
           <td style="padding:10px 16px;font-weight:600;color:#1a365d;width:40%;border-bottom:1px solid #e2e8f0;font-size:14px;">${label}</td>
           <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">${value}</td>
         </tr>`
      : '';

  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#1a365d,#2b6cb0);padding:28px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;letter-spacing:0.5px;">New Copier/Printer Quote Request</h1>
      <p style="color:#bee3f8;margin:8px 0 0;font-size:14px;">JR Copier</p>
    </div>

    <div style="padding:24px;">
      <h2 style="color:#1a365d;font-size:15px;border-bottom:2px solid #2b6cb0;padding-bottom:6px;margin-bottom:12px;">Contact Information</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${row('Name', formData.fullname)}
        ${row('Email', formData.email)}
        ${row('Phone', formData.phone)}
        ${row('Company', formData.company || '—')}
        ${row('ZIP Code', formData.zip)}
      </table>

      <h2 style="color:#1a365d;font-size:15px;border-bottom:2px solid #2b6cb0;padding-bottom:6px;margin-bottom:12px;">Request Details</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        ${row('Usage Type', usageLabels[formData.usage] || formData.usage || '—')}
        ${row('Printer Type', printerTypeLabels[formData.printerType] || formData.printerType || '—')}
      </table>

      ${formData.pageUrl ? `<p style="font-size:12px;color:#a0aec0;margin-top:16px;">Submitted from: ${formData.pageUrl}</p>` : ''}
    </div>

    <div style="background:#f7fafc;padding:16px;text-align:center;font-size:12px;color:#718096;">
      Submitted on ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT
    </div>
  </div>`;
}

// ─── API Endpoint ────────────────────────────────────────────────
app.post('/api/send-form', async (req, res) => {
  try {
    const { formData } = req.body;

    if (!formData) {
      return res.status(400).json({ error: 'Missing form data' });
    }

    const name = formData.fullname || 'Unknown';

    // Send email + CRM + 360Connect in parallel
    const [emailResult, crmResult, lc360Result] = await Promise.allSettled([
      getResend().emails.send({
        from: FROM_EMAIL,
        to: getRecipients(),
        subject: `New Copier Quote: ${name} — ${formData.zip || 'No ZIP'}`,
        html: buildEmailHtml(formData),
        ...(formData.email && { replyTo: formData.email }),
      }),
      sendToCRM(formData),
      sendTo360Connect(formData),
    ]);

    // Log results
    if (emailResult.status === 'fulfilled') {
      if (emailResult.value.error) {
        console.error('Resend error:', emailResult.value.error);
      } else {
        console.log('Email sent:', emailResult.value.data?.id);
      }
    } else {
      console.error('Email failed:', emailResult.reason);
    }

    if (crmResult.status === 'fulfilled') {
      console.log('CRM webhook sent successfully');
    } else {
      console.error('CRM webhook failed:', crmResult.reason);
    }

    if (lc360Result.status === 'fulfilled') {
      console.log('360Connect LeadConduit sent successfully:', JSON.stringify(lc360Result.value));
    } else {
      console.error('360Connect failed:', lc360Result.reason);
    }

    const emailOk  = emailResult.status  === 'fulfilled' && !emailResult.value.error;
    const crmOk    = crmResult.status    === 'fulfilled';
    const lc360Ok  = lc360Result.status  === 'fulfilled';

    if (emailOk || crmOk || lc360Ok) {
      return res.json({ success: true, email: emailOk, crm: crmOk, leadconduit: lc360Ok });
    } else {
      return res.status(500).json({ error: 'All integrations failed' });
    }
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'MISSING');
  console.log('CRM_API_KEY:', process.env.CRM_API_KEY ? 'SET' : 'MISSING');
  console.log('CRM_WEBHOOK_URL:', process.env.CRM_WEBHOOK_URL ? 'SET' : 'MISSING');
  console.log('CRM_FORM_ID:', process.env.CRM_FORM_ID ? 'SET' : 'MISSING');
  console.log('Recipients:', getRecipients().join(', '));
});
