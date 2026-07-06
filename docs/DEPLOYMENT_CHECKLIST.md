# Complete Deployment Checklist

## Pre-Deployment (Local Development)

### Code Review
- [ ] Read AUDIT_REPORT.md (verification complete)
- [ ] Run `npm run build` locally (3.50s, 0 errors)
- [ ] Check git status (`git status`)
- [ ] All changes committed (`git log --oneline -5`)

### Environment Setup
- [ ] .env.local created with all variables
- [ ] VITE_SUPABASE_URL verified
- [ ] VITE_SUPABASE_ANON_KEY verified
- [ ] VITE_TRACKING_DOMAIN set
- [ ] VITE_CUSTOM_TRACKING_ENABLED=true

### Testing
- [ ] Run dev server: `npm run dev`
- [ ] App loads at localhost:5174
- [ ] Analytics logs show in console: `[Analytics] Initialized`
- [ ] No critical errors in console
- [ ] Responsive design verified (mobile/tablet/desktop)

---

## Step 1: Push to GitHub (2 minutes)

```bash
git push origin main
```

- [ ] Code pushed successfully
- [ ] All commits visible on GitHub
- [ ] No merge conflicts

---

## Step 2: Configure Vercel Project (5 minutes)

### Option A: New Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Select GitHub repository
4. Import your project
5. Wait for build to complete

### Option B: Existing Vercel Project

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Wait for auto-redeploy after `git push`

**Checklist:**
- [ ] Project imported or connected
- [ ] Build completed successfully (~60 sec)
- [ ] Deployment successful (~2 min)
- [ ] Project URL assigned (e.g., app-name.vercel.app)

---

## Step 3: Add Environment Variables (5 minutes)

On Vercel Settings → Environment Variables:

### Required: Supabase

- [ ] VITE_SUPABASE_URL = `https://ubvefzwleuvsohnboktt.supabase.co`
- [ ] VITE_SUPABASE_ANON_KEY = `sb_publishable_gipi4cIKwUXvvqtF3ujpwA_bRQ7DbH9`

### Required: Custom Analytics

- [ ] VITE_TRACKING_DOMAIN = `1tr4ck.dpdns.org`
- [ ] VITE_CUSTOM_TRACKING_ENABLED = `true`

### Optional: Monetization

- [ ] VITE_MONETAG_SITE_ID = (if you have)
- [ ] VITE_MONETAG_ENABLED = (true/false)
- [ ] VITE_LARAFLY_DOMAIN = (if you have)
- [ ] VITE_LARAFLY_ZONE_ID = (if you have)
- [ ] VITE_LARAFLY_ENABLED = (true/false)

### Optional: Notifications & Security

- [ ] TELEGRAM_BOT_TOKEN = (if you have)
- [ ] TELEGRAM_CHAT_ID = (if you have)
- [ ] VITE_IP_API_ENABLED = (true/false)
- [ ] VITE_ANTI_BOT_ENABLED = (true/false)
- [ ] VITE_BLOCK_VPN = (true/false)
- [ ] VITE_BLOCK_DATACENTER = (true/false)
- [ ] VITE_TRACKING_ENABLED = (true/false)

**Checklist:**
- [ ] All variables added to Environment Variables
- [ ] Environment: Production selected
- [ ] Values copied exactly (no extra spaces)
- [ ] Variables saved

---

## Step 4: Redeploy with Variables (3 minutes)

1. Go to Vercel Dashboard
2. Select your project
3. Click "Redeploy" or "Deploy"
4. Wait for build and deploy to complete

**Checklist:**
- [ ] Redeploy initiated
- [ ] Build completed (~60 sec)
- [ ] Deployment successful (~2 min)
- [ ] Project shows green status

---

## Step 5: Connect Custom Domain (10-15 minutes)

### 5A: Add Domain to Vercel

1. Go to Vercel Project Settings
2. Go to "Domains" section
3. Click "Add Domain"
4. Enter: `1tr4ck.dpdns.org`
5. Select "Redirect from www" (optional)
6. Click "Add"

**Checklist:**
- [ ] Domain added to Vercel
- [ ] Shows "Verifying ownership..." status
- [ ] Instructions displayed for DNS setup

### 5B: Configure DNS on Cloudflare

**Reference:** See DNS_CLOUDFLARE_SETUP.md for detailed instructions

1. Go to [cloudflare.com](https://cloudflare.com)
2. Login to your account
3. Select domain: `1tr4ck.dpdns.org`
4. Go to "DNS" section

#### Add A Record:
- Type: A
- Name: @
- Content: 216.198.79.1
- TTL: Auto
- Proxy Status: DNS only (grey cloud)
- Click "Save"

#### Add TXT Record (Verification):
- Type: TXT
- Name: _vercel
- Content: `vc-domain-verify=1tr4ck.dpdns.org,64b699698515f474f765`
- TTL: Auto
- Click "Save"

**Checklist:**
- [ ] Logged into Cloudflare
- [ ] Selected domain: 1tr4ck.dpdns.org
- [ ] A record added: @ → 216.198.79.1
- [ ] TXT record added: _vercel → vc-domain-verify=...
- [ ] Both records show "DNS only"
- [ ] DNS saved in Cloudflare

---

## Step 6: Wait for DNS Propagation (15-30 minutes)

DNS changes take time to propagate globally.

### Monitor Progress:

1. **Cloudflare Dashboard:**
   - Verify records are saved
   - Status should show "Active"

2. **Vercel Dashboard:**
   - Domain section should show "Verifying..."
   - After DNS propagates → "Verified" (green)

3. **Check DNS Globally:**
   - Go to [whatsmydns.net](https://whatsmydns.net)
   - Search: `1tr4ck.dpdns.org`
   - Look for new records (216.198.79.1 A record)

**Checklist:**
- [ ] Cloudflare shows records are active
- [ ] Waited 15-30 minutes
- [ ] whatsmydns.net shows correct records
- [ ] Vercel shows domain as "Verified"

---

## Step 7: Verify HTTPS Certificate (15-30 minutes after verification)

Once domain is verified, Vercel issues HTTPS certificate automatically.

### Check Certificate Status:

1. Vercel Settings → Domains
2. Click on your domain
3. Look for "SSL Certificate" section
4. Should show "Valid certificate issued"

### Verify Certificate:

```bash
# Check SSL status
https://1tr4ck.dpdns.org
```

Should show:
- Green padlock icon
- HTTPS in URL bar
- No SSL warnings

**Checklist:**
- [ ] HTTPS certificate issued (green checkmark)
- [ ] No SSL warnings
- [ ] Can access https://1tr4ck.dpdns.org
- [ ] URL bar shows padlock

---

## Step 8: Test Production App (5 minutes)

### Visit Your App

```
https://1tr4ck.dpdns.org
```

**Checklist:**
- [ ] App loads completely
- [ ] No 404 errors
- [ ] HTTPS works (padlock visible)
- [ ] Performance acceptable
- [ ] Dark mode works
- [ ] Responsive on mobile

### Test Analytics

1. Open DevTools (F12)
2. Go to Console tab
3. Look for: `[Analytics] Initialized successfully`
4. Go to Network tab
5. Trigger an event (click button, change page)
6. Look for POST to `1tr4ck.dpdns.org/api/events`

**Checklist:**
- [ ] Analytics logs appear in console
- [ ] POST requests sent to 1tr4ck.dpdns.org
- [ ] No 404 errors for analytics endpoint
- [ ] Events data visible in Network tab

### Test Supabase Auth

1. Try to access protected routes
2. Should redirect to login/signup
3. Test signup with email
4. Test login
5. Should redirect to app

**Checklist:**
- [ ] Auth working
- [ ] Can create account
- [ ] Can login
- [ ] Sessions persist

---

## Step 9: Final Verification Checklist

### Core Features
- [ ] App loads at https://1tr4ck.dpdns.org
- [ ] HTTPS certificate valid (no warnings)
- [ ] Analytics initialized
- [ ] Supabase auth working
- [ ] Responsive design verified
- [ ] Dark mode working
- [ ] All languages loading (FR/EN)

### Performance
- [ ] Page loads in <3 seconds
- [ ] Lighthouse score visible
- [ ] No console errors
- [ ] No broken images
- [ ] Video player loads

### Security
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] Security headers present
- [ ] No mixed content errors
- [ ] No CORS issues

### Monitoring
- [ ] Can access Vercel Analytics
- [ ] Build logs visible
- [ ] Error logs accessible
- [ ] Environment variables secure

---

## Step 10: Post-Deployment Setup (Optional but Recommended)

### 1. Set Up Analytics Endpoint

Your tracking domain needs an API endpoint:

```
POST https://1tr4ck.dpdns.org/api/events
```

Implement this to receive analytics events.

**Reference:** CUSTOM_ANALYTICS.md - Server Implementation section

- [ ] Created /api/events endpoint
- [ ] Accepts POST with JSON
- [ ] Returns 200 OK
- [ ] Stores or processes events

### 2. Monitor Events

Once endpoint is ready:

1. Visit your app
2. Trigger some events (clicks, page changes)
3. Check if events arrive at your endpoint
4. Verify event data structure

- [ ] Events arriving at endpoint
- [ ] Data format correct
- [ ] Session IDs consistent
- [ ] Timestamps accurate

### 3. Wait for Network Approval

If using Monetag/Larafly ads:

- [ ] Monetag approval (24-48 hours)
- [ ] Larafly approval (24-48 hours)
- [ ] Ads appear on site
- [ ] Revenue tracking working

---

## Deployment Timeline

```
Step                              Time      Total
─────────────────────────────────────────────────
1. Push to GitHub                 2 min     2 min
2. Vercel project setup           5 min     7 min
3. Add environment variables      5 min     12 min
4. Redeploy with variables        3 min     15 min
5. DNS configuration              10 min    25 min
6. DNS propagation (wait)         20 min    45 min
7. HTTPS certificate (automatic)  20 min    65 min
8. Test production app            5 min     70 min
9. Final verification             5 min     75 min
10. Post-deployment setup         varies    varies

TOTAL DEPLOYMENT TIME: ~75 minutes (1h 15 min)
```

---

## Troubleshooting Guide

### App won't load at Vercel URL?

1. Check Vercel build logs for errors
2. Verify all environment variables added
3. Check git history for broken code
4. Roll back if needed and redeploy

### Custom domain not verified?

1. Verify DNS records in Cloudflare are correct
2. Check with whatsmydns.net
3. Wait 30+ minutes for propagation
4. Click "Refresh" on Vercel
5. Check Vercel domain verification status

### HTTPS certificate not issued?

1. Wait 30 minutes after domain verification
2. Check Vercel Settings → Domains → SSL status
3. Verify DNS records still correct
4. Try manually requesting certificate in Vercel

### Analytics events not tracked?

1. Check console: [Analytics] messages
2. Verify VITE_CUSTOM_TRACKING_ENABLED=true
3. Check Network tab for POST requests
4. Verify domain is accessible
5. Set up /api/events endpoint

### Performance issues?

1. Check Vercel Analytics dashboard
2. Look for slow API responses
3. Check Supabase query performance
4. Monitor Network tab for large assets
5. Check build bundle size

---

## Support Resources

- **Vercel Docs:** https://vercel.com/docs
- **Cloudflare DNS:** https://developers.cloudflare.com/dns/
- **DNS Propagation:** https://whatsmydns.net
- **Project Docs:** See documentation files in repo

---

## Sign-Off

- [ ] All steps completed
- [ ] App is live at https://1tr4ck.dpdns.org
- [ ] All features verified working
- [ ] Analytics ready to use
- [ ] Post-deployment setup started

**Deployment Status:** ✅ COMPLETE

---

Generated: 2024-01-15
Expected: ~75 minutes total
Status: Ready for Deployment
