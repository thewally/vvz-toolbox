import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { voornaam, achternaam, email, telefoon, geboortedatum, captchaToken } = await req.json()

    // Validate required fields
    if (!voornaam || !achternaam || !email || !telefoon || !geboortedatum || !captchaToken) {
      return new Response(
        JSON.stringify({ error: 'Alle velden zijn verplicht.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify Cloudflare Turnstile token
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    const captchaVerify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: turnstileSecret!,
        response: captchaToken,
      }),
    })
    const captchaResult = await captchaVerify.json()
    if (!captchaResult.success) {
      return new Response(
        JSON.stringify({ error: 'CAPTCHA verificatie mislukt. Probeer het opnieuw.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert aanvraag using service role (bypasses RLS for insert from edge function)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: aanvraag, error: insertError } = await supabase
      .from('proeftraining_aanvragen')
      .insert({ voornaam, achternaam, email, telefoon, geboortedatum })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Opslaan mislukt. Probeer het opnieuw.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch notification email from settings
    const { data: settings } = await supabase
      .from('lid_worden_settings')
      .select('notificatie_email')
      .eq('id', 1)
      .single()

    const notificatieEmail = settings?.notificatie_email
    if (notificatieEmail) {
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      const emailBody = `
        <h2>Nieuwe proeftraining aanvraag</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Naam</td><td style="padding: 8px;">${voornaam} ${achternaam}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">E-mail</td><td style="padding: 8px;"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Telefoon</td><td style="padding: 8px;"><a href="tel:${telefoon}">${telefoon}</a></td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Geboortedatum</td><td style="padding: 8px;">${new Date(geboortedatum).toLocaleDateString('nl-NL')}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Aangemeld op</td><td style="padding: 8px;">${new Date().toLocaleString('nl-NL')}</td></tr>
        </table>
      `

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VVZ\'49 Toolbox <onboarding@resend.dev>',
          to: [notificatieEmail],
          subject: `Nieuwe proeftraining aanvraag: ${voornaam} ${achternaam}`,
          html: emailBody,
        }),
      })
    }

    return new Response(
      JSON.stringify({ data: aanvraag }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Er is een onverwachte fout opgetreden.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
