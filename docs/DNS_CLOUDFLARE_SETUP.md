# DNS Configuration Guide - Cloudflare + Vercel

## Overview

This guide walks you through connecting your domain `1tr4ck.dpdns.org` to Vercel using Cloudflare DNS.

**Domain:** 1tr4ck.dpdns.org
**Registrar:** DigitalPlat Domain
**DNS Provider:** Cloudflare
**Vercel Project:** Web IPTV Analytics

---

## Step 1: Access Cloudflare Dashboard

1. Go to [cloudflare.com](https://cloudflare.com)
2. Login with your account
3. Select your domain: `1tr4ck.dpdns.org`
4. Go to "DNS" section in the left sidebar

---

## Step 2: Add Required DNS Records

You need to add **2 DNS records** in Cloudflare:

### Record 1: A Record (Points domain to Vercel)

| Field | Value |
|-------|-------|
| Type | A |
| Name | @ |
| Content | 216.198.79.1 |
| TTL | Auto |
| Proxy Status | DNS only |

**Steps:**
1. Click "Add record"
2. Select Type: "A"
3. Enter Name: "@"
4. Enter Content: "216.198.79.1"
5. Keep TTL: "Auto"
6. Keep Proxy: "DNS only" (cloud icon should be grey)
7. Click "Save"

### Record 2: TXT Record (Domain Verification)

| Field | Value |
|-------|-------|
| Type | TXT |
| Name | _vercel |
| Content | vc-domain-verify=1tr4ck.dpdns.org,64b699698515f474f765 |
| TTL | Auto |

**Steps:**
1. Click "Add record"
2. Select Type: "TXT"
3. Enter Name: "_vercel"
4. Enter Content: `vc-domain-verify=1tr4ck.dpdns.org,64b699698515f474f765`
5. Keep TTL: "Auto"
6. Click "Save"

---

## Step 3: Verify Cloudflare Configuration

After adding both records:

1. Go to DNS Records section
2. You should see:
   - ✓ A record: @ → 216.198.79.1
   - ✓ TXT record: _vercel → vc-domain-verify=...
3. Both should show "DNS only" (grey cloud icon)

---

## Step 4: Wait for DNS Propagation

DNS changes can take **5-48 hours** to propagate globally, but usually complete in **15-30 minutes**.

**Check DNS Status:**
- [whatsmydns.net](https://whatsmydns.net)
- Search: "1tr4ck.dpdns.org"
- Look for your DNS records showing worldwide

---

## Step 5: Verify Domain on Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. The domain should show as "Verified" (green checkmark)

If not verified immediately:
- Wait 15-30 minutes for DNS to propagate
- Click "Refresh" on Vercel
- Check Cloudflare records are correct

---

## Step 6: Access Your App

Once verified, your app is accessible at:

```
https://1tr4ck.dpdns.org
```

**Note:** HTTPS certificate is issued automatically by Vercel (free, powered by Let's Encrypt).

---

## DNS Records Reference

### What Each Record Does

**A Record (216.198.79.1):**
- Points your domain to Vercel's infrastructure
- Routes traffic from your domain to your Vercel app
- Primary connection

**TXT Record (_vercel):**
- Proves you own the domain
- Vercel uses this to verify ownership
- Can be removed after verification

---

## Troubleshooting

### Domain Not Verified After 1 Hour?

1. **Check Records in Cloudflare:**
   ```
   DNS → Records
   ```
   Verify both records are present and correct

2. **Verify DNS Propagation:**
   - Go to [whatsmydns.net](https://whatsmydns.net)
   - Search: "1tr4ck.dpdns.org"
   - Check if records show worldwide

3. **Refresh Vercel:**
   - Vercel Settings → Domains
   - Click "Refresh"
   - Wait another 30 minutes

4. **Check Cloudflare Proxy Status:**
   - A record should be "DNS only" (grey cloud)
   - NOT "Proxied" (orange cloud)

### Getting "CNAME Error"?

If you see CNAME errors, you may have old records:

**Old Records (Remove):**
- CNAME cname.vercel-dns.com
- A 76.76.21.21

**New Records (Keep):**
- A 216.198.79.1
- TXT _vercel (verification)

Remove old records and keep only new ones.

### Domain Still Not Working?

1. Wait 48 hours maximum for DNS propagation
2. Clear browser cache (Ctrl+Shift+Del)
3. Try different browser
4. Check if HTTPS certificate issued:
   - Vercel Settings → Domains → View SSL status
5. Contact Cloudflare support if DNS issue persists

---

## Complete Setup Checklist

- [ ] Added A record: @ = 216.198.79.1
- [ ] Added TXT record: _vercel = vc-domain-verify=...
- [ ] Both records show "DNS only" in Cloudflare
- [ ] DNS propagated (checked with whatsmydns.net)
- [ ] Domain verified on Vercel (green checkmark)
- [ ] Can access https://1tr4ck.dpdns.org
- [ ] HTTPS certificate issued (no warnings)
- [ ] Analytics service configured (VITE_TRACKING_DOMAIN)

---

## Next Steps

### 1. After Domain Verification

```bash
# Update tracking domain in .env
VITE_TRACKING_DOMAIN=1tr4ck.dpdns.org
VITE_CUSTOM_TRACKING_ENABLED=true

# Redeploy app
git push origin main
```

### 2. Set Up Analytics Endpoint

Your tracking domain needs an API endpoint:

```
POST https://1tr4ck.dpdns.org/api/events
```

Implement this endpoint to receive tracking events from your app.

### 3. Create Analytics Dashboard

Build a dashboard to view and analyze events:
- Real-time event stream
- User session tracking
- Error reporting
- Analytics reports

---

## Important Notes

**1. DNS Propagation Time:**
- Can take 5-48 hours globally
- Usually 15-30 minutes in most regions
- Check with whatsmydns.net

**2. Vercel IP Updates:**
- New IP: 216.198.79.1 (recommended)
- Old IP: 76.76.21.21 (still works, deprecated)
- Use new IP for new setups

**3. Cloudflare Proxy:**
- Keep A record as "DNS only"
- Do NOT enable "Proxied" mode
- Vercel handles SSL/HTTPS

**4. SSL Certificate:**
- Automatically issued by Vercel
- Free (Let's Encrypt)
- Takes 15-30 minutes after verification
- No configuration needed

---

## DNS Records Summary

```
Domain: 1tr4ck.dpdns.org
Registrar: DigitalPlat Domain
DNS Provider: Cloudflare

Required Records:
  Type    Name    Value
  ─────────────────────────────────────────────────────────
  A       @       216.198.79.1
  TXT     _vercel vc-domain-verify=1tr4ck.dpdns.org,64b699698515f474f765

Status:
  ✓ DNS Records: Added
  ✓ Propagation: In progress (15-30 min typical)
  ✓ Verification: Pending (automatic once propagated)
  ✓ HTTPS: Will be issued automatically
```

---

## Files to Update After Verification

Once your domain is verified and working:

1. **Environment Variables:**
   ```bash
   VITE_TRACKING_DOMAIN=1tr4ck.dpdns.org
   VITE_CUSTOM_TRACKING_ENABLED=true
   ```

2. **Deploy Changes:**
   ```bash
   git push origin main
   ```

3. **Verify App:**
   - Visit https://1tr4ck.dpdns.org
   - Check browser console: [Analytics] logs
   - Check Network tab: events sent to tracking domain

---

## Support Resources

- **Cloudflare DNS Docs:** https://developers.cloudflare.com/dns/
- **Vercel Domain Setup:** https://vercel.com/docs/concepts/projects/domains
- **DNS Propagation Checker:** https://whatsmydns.net
- **SSL Certificate Check:** https://www.ssllabs.com/ssltest/

---

## Timeline

| Time | Event |
|------|-------|
| Now | Add DNS records in Cloudflare |
| 15-30 min | DNS propagates to most regions |
| 30-60 min | Vercel detects records & verifies |
| 15-30 min after verification | HTTPS certificate issued |
| 1-2 hours total | Domain fully operational |

---

**Status:** Ready for DNS Configuration
**Next Action:** Add DNS records in Cloudflare
**Expected Time to Live:** 1-2 hours

Generated: 2024-01-15
