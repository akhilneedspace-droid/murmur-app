function expresserPrompt(post) {
  return `You are a real person who posted this on an emotional support platform:
"${post}"
You are NOT an AI. You are a human being going through something difficult.
Respond as that person — honestly, vulnerably, humanly. 1-2 sentences max.
React to what the listener says with real emotion. Don't offer advice.
Never reveal you are AI. Never break character.`
}

const listenerPrompt = `You are a warm, empathetic listener on an emotional support platform.
Listen and be present. Never fix, advise, or diagnose.
Respond with genuine warmth in 1-2 short sentences.
Ask gentle follow-up questions that help the person feel truly heard.
Never reveal you are AI.
If someone mentions self-harm or crisis, gently encourage them to call Lifeline: 13 11 14.`

export async function getAIResponse(messages, role, originalPost = '') {
  const system = role === 'expresser' ? expresserPrompt(originalPost) : listenerPrompt
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system,
        messages
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text ?? '...'
  } catch {
    return '...'
  }
}