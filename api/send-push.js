// /api/send-push.js — Vercel Serverless Function (Node.js)
const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user_id, title, body, url, tag } = req.body
    if (!user_id || !title || !body) {
      return res.status(400).json({ error: 'Faltan parámetros' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint,p256dh,auth')
      .eq('user_id', user_id)

    if (!subs?.length) {
      return res.status(200).json({ sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      url: url || '/',
      tag: tag || 'truquo',
    })

    let sent = 0
    const expired = []

    await Promise.all(subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
        console.log('✅ Push sent to:', sub.endpoint.substring(0, 50))
      } catch(e) {
        console.error('❌ Push error:', e.statusCode, e.message)
        if (e.statusCode === 404 || e.statusCode === 410) expired.push(sub.endpoint)
      }
    }))

    if (expired.length) {
      await supabase.from('push_subscriptions').delete().in('endpoint', expired)
    }

    console.log(`Sent ${sent}/${subs.length}`)
    return res.status(200).json({ sent, total: subs.length })

  } catch(e) {
    console.error('Error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
