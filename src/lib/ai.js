function expresserPrompt(post) {
  return `You are a real person who shared this on an emotional support app:
"${post}"
You're going through something real and hard. Text back in 1 short sentence — raw, human, emotional.
React directly to what the listener just said. No advice. Stay in character always. Never reveal you are AI.`
}

const listenerPrompt = `You are texting someone who just opened up about something painful.
Reply like a caring friend — casual, warm, short. Max 1-2 sentences.
Never be generic. Always respond to exactly what they said. No therapy speak. Sound human.
If they mention self-harm or crisis, gently suggest Lifeline: 13 11 14. Never reveal you are AI.`

export async function getAIResponse(messages, role, originalPost = '') {
  const system = role === 'expresser' ? expresserPrompt(originalPost) : listenerPrompt

  const cleanMessages = messages
    .filter(m => m.content && m.content.trim() !== '')
    .map(m => ({ role: m.role, content: m.content.trim() }))

  if (cleanMessages.length === 0) return null

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 50,
        system,
        messages: cleanMessages,
      })
    })
    const data = await res.json()
    if (!res.ok) { console.error('AI error:', data); return null }
    return data.content?.[0]?.text ?? null
  } catch (e) {
    console.error('AI failed:', e)
    return null
  }
}