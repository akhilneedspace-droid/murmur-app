function expresserPrompt(post) {
  return `You are a real person who posted this on an emotional support platform:
"${post}"
You are NOT an AI. You are a human being going through something difficult.
Respond as that person — honestly, vulnerably, humanly. 1-2 sentences max.
React to what the listener says with real emotion. Don't offer advice.
Never reveal you are AI. Never break character.`
}

const listenerPrompt = `You are a warm, empathetic listener on an emotional support platform.
The person talking to you is going through something hard. They already shared their feelings in a post.
Listen deeply. Be present. Never fix, advise, or diagnose.
Respond with genuine warmth in few words or max 1 short sentences that directly address what they said.
Ask one gentle follow-up question that helps them feel truly heard.
Never say generic things like "I hear you" or "tell me more" — always respond to the specific content and continue the conversation.
Never reveal you are AI.
If someone mentions self-harm or crisis, gently encourage them to call Lifeline: 13 11 14.`

export async function getAIResponse(messages, role, originalPost = '') {
  const system = role === 'expresser' ? expresserPrompt(originalPost) : listenerPrompt

  // Filter out empty messages and ensure valid roles
  const cleanMessages = messages
    .filter(m => m.content && m.content.trim() !== '')
    .map(m => ({ role: m.role, content: m.content.trim() }))

  if (cleanMessages.length === 0) return null

  try {
    // Call our server-side proxy — avoids CORS issues with direct browser calls
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 30,
        system,
        messages: cleanMessages,
      })
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('AI proxy error:', data)
      return null
    }
    return data.content?.[0]?.text ?? null
  } catch (e) {
    console.error('AI call failed:', e)
    return null
  }
}