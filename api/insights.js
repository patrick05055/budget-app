export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { prompt } = await req.json()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (data.error) {
    return new Response(JSON.stringify({ error: data.error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const text = data.content
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n') || 'No response.'

  return new Response(JSON.stringify({ text }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
