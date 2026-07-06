import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SG_KEY = Deno.env.get("SENDGRID_API_KEY")!

serve(async (req) => {
  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, html" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SG_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: "hobhaboub61@gmail.com", name: "IPTV Web" },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(
        JSON.stringify({ error: "SendGrid error", detail: err }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
