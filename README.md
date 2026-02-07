# JR Copier — Embeddable Quote Form

Multi-step copier/printer quote form with Resend email and SureLeadsFlow CRM integration.

## Files
```
copier-form/
├── server.js          # Express server (Resend + CRM webhook)
├── package.json       # Dependencies
└── public/
    ├── index.html     # The multi-step form
    └── embed.js       # Embed script for other websites
```

## Deploy to Railway

### 1. Create GitHub repo
Upload `server.js`, `package.json`, and the `public/` folder.

### 2. Connect to Railway
Create new project → Deploy from GitHub → Select repo.

### 3. Set environment variables

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | Your Resend API key |
| `CRM_API_KEY` | Your SureLeadsFlow API key |
| `CRM_WEBHOOK_URL` | `https://camwxepkxdzxmcnqahzj.supabase.co/functions/v1/inbound-lead-webhook` |
| `EMAIL_RECIPIENTS` | Comma-separated emails (e.g. `rafael@jrcopier.com,sales@jrcopier.com`) |
| `FROM_EMAIL` | Sender name/email (e.g. `JR Copier <noreply@webleadsnow.com>`) |

### 4. Generate domain
Settings → Networking → Generate Domain.

## Embedding on Websites

### Option A: Script embed (recommended)
```html
<div id="jrcopier-form"></div>
<script src="https://YOUR-RAILWAY-URL.up.railway.app/embed.js"></script>
```

### Option B: Direct iframe
```html
<iframe
  src="https://YOUR-RAILWAY-URL.up.railway.app/"
  width="100%"
  height="680"
  style="border:none;max-width:520px;display:block;margin:0 auto;border-radius:12px;"
  title="Get Free Copier Quotes"
></iframe>
```

### Embed Options (Script method)
```html
<div id="my-custom-div"></div>
<script
  src="https://YOUR-RAILWAY-URL.up.railway.app/embed.js"
  data-container="my-custom-div"
  data-height="700"
  data-width="100%"
></script>
```

### Success Event (for redirects / tracking)
```javascript
window.addEventListener('message', function(e) {
  if (e.data.type === 'jrcopier-form-success') {
    console.log('Lead submitted:', e.data.data);
    window.location.href = '/thank-you';
  }
});
```

## CRM Webhook Payload
```json
{
  "source": "jr-copier-quote-form",
  "submitted_at": "2026-02-07T12:00:00.000Z",
  "contact": {
    "full_name": "John Smith",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "company": "Acme Corp",
    "zip_code": "55311"
  },
  "project": {
    "usage_type": "Commercial Business",
    "printer_type": "Floor-Standing Model"
  },
  "referral_source": "",
  "page_url": "https://example.com/copier-quotes"
}
```
