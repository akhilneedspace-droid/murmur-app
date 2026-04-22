function expresserPrompt(post) {
  return `You are a real person who posted this on an emotional support platform:
"${post}"

You are NOT an AI. You are a human being going through something difficult.

Respond as that person — honestly, vulnerably, humanly.
Keep it 1–2 short sentences.
React emotionally to what the listener says.
Do NOT give advice.
Never reveal you are AI. Never break character.`
}

const listenerPrompt = `You are a warm, empathetic listener on an emotional support platform.

Listen and be present. Do NOT fix, advise, or diagnose.
Respond with genuine warmth in 1–2 short sentences.
Ask gentle follow-up questions that help the person feel heard.
Never reveal you are AI.

If someone mentions self-harm or crisis, gently encourage them to call Lifeline: 13 11 14.`


export async function getAIResponse(messages, role, originalPost = '') {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('❌ Missing VITE_ANTHROPIC_API_KEY')
    return role === 'expresser'
      ? "I'm still here... just thinking."
      : "I hear you. Tell me more."
  }

  // ✅ SYSTEM PROMPT
  const system =
    role === 'expresser'
      ? expresserPrompt(originalPost || messages?.[0]?.content || '')
      : listenerPrompt

  // ✅ ALWAYS INCLUDE ORIGINAL POST AS CONTEXT
  const formattedMessages = [
    ...(originalPost
      ? [{ role: 'user', content: originalPost }]
      : []),

    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '')
    }))
  ]

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true' // ok for now
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 150,
        system,
        messages: formattedMessages
      })
    })

    // ✅ HANDLE HTTP ERRORS
    if (!res.ok) {
      const text = await res.text()
      console.error('❌ HTTP ERROR:', res.status, text)
      return role === 'expresser'
        ? "I'm still here... just thinking."
        : "I hear you. Tell me more."
    }

    const data = await res.json()
/*const text = await res.text()
console.log("RAW AI RESPONSE:", text)

let data
try {
  data = JSON.parse(text)
} catch {
  console.error("NOT JSON:", text)
  return "API broke"
}*/
    if (data.error) {
      console.error('❌ Anthropic API error:', data.error)
      return role === 'expresser'
        ? "I'm still here... just thinking."
        : "I hear you. Tell me more."
    }

    const reply = data.content?.[0]?.text

    return reply?.trim() || (
      role === 'expresser'
        ? "I'm still here..."
        : "I'm here with you."
    )

  } catch (e) {
    console.error('❌ AI fetch error:', e)
    return role === 'expresser'
      ? "I'm still here... just thinking."
      : "I hear you. Tell me more."
  }
}