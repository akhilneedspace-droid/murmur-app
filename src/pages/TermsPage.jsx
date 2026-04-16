import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
  const navigate = useNavigate()
  const date = 'April 2026'

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', padding: '0 0 80px', fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '52px 28px 0' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(240,239,232,0.5)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 40 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>

        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 12 }}>Terms of Service</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>Last updated: {date}</p>
        </div>

        {[
          {
            heading: '1. About Murmur',
            body: `Murmur is a peer support platform that provides a space for people to share their thoughts and feelings and connect with other community members who are willing to listen. Murmur is operated from Australia and is subject to Australian law.\n\nMurmur is NOT a mental health service, therapy platform, crisis service, or medical service of any kind. Nothing on Murmur constitutes professional mental health advice, diagnosis, or treatment.`
          },
          {
            heading: '2. Who can use Murmur',
            body: `You must be 18 years or older to use Murmur. By creating an account, you confirm that you are at least 18 years of age. We require email and phone verification to maintain a safe community and to reduce fake accounts and bots.\n\nYou must provide accurate information when creating your account.`
          },
          {
            heading: '3. Peer support — not therapy',
            body: `Murmur connects people for peer support only. Listeners on Murmur are community members — ordinary people who have chosen to be present for others. They are not trained therapists, counsellors, psychologists, or medical professionals.\n\nIf you are experiencing a mental health crisis, suicidal thoughts, or are in immediate danger, please contact:\n\n• Lifeline: 13 11 14 (24/7, Australia)\n• Beyond Blue: 1300 22 4636\n• Emergency services: 000\n• Crisis Text Line: Text HOME to 741741\n\nMurmur expressly disclaims any responsibility for outcomes arising from peer conversations on the platform.`
          },
          {
            heading: '4. Your content',
            body: `When you post on Murmur, you retain ownership of what you write. By posting, you grant Murmur a limited licence to display your content to other users as part of the platform's functionality.\n\nYou are responsible for what you post. You agree not to post content that is harmful, harassing, abusive, discriminatory, or that promotes self-harm or violence. Posts that violate these terms may be removed and your account may be suspended or terminated.\n\nWhen you delete a conversation from your view, your messages are removed from your dashboard but may be retained in our database for safety and moderation purposes.`
          },
          {
            heading: '5. Anonymity and privacy',
            body: `Murmur allows you to post anonymously. When you post anonymously, your display name is hidden from listeners. However, your account identity is always traceable to us internally for safety and moderation purposes. We do not sell anonymous posts to anyone — the platform knows who you are even when others do not.\n\nSee our Privacy Policy for full details on how we handle your data.`
          },
          {
            heading: '6. Listener conduct',
            body: `If you choose to be a Listener, you agree to engage with empathy and respect. You must not use listening sessions to harass, manipulate, or take advantage of vulnerable people. You must not share personal information disclosed to you in a session with anyone outside the platform.\n\nListening is voluntary. You may end a session at any time.`
          },
          {
            heading: '7. AI on the platform',
            body: `Murmur uses AI (powered by Anthropic's Claude) as a fallback listener when no human listener is available within a set period. When an AI listener is present, it operates within the same empathetic guidelines as human listeners. The AI is designed to provide supportive responses only — it does not provide medical advice.\n\nWe do not use AI to deceive users into thinking they are speaking with a human. AI interactions are always subject to our system-level prompts designed for empathetic peer support.`
          },
          {
            heading: '8. Limitation of liability',
            body: `To the maximum extent permitted by Australian law, Murmur and its operators accept no liability for:\n\n• Any harm arising from conversations between users\n• Any failure to prevent harmful content from being posted\n• Any technical outages or data loss\n• Any actions taken or not taken by users as a result of conversations on the platform\n\nYou use Murmur at your own risk. This does not affect any rights you have under the Australian Consumer Law.`
          },
          {
            heading: '9. Changes to these terms',
            body: `We may update these Terms from time to time. If we make material changes, we will notify you by email or through the platform. Continued use of Murmur after changes take effect constitutes acceptance of the updated Terms.`
          },
          {
            heading: '10. Contact',
            body: `If you have any questions about these Terms or need to report a safety concern, please contact us through the platform or via the email address provided in your account settings.`
          },
        ].map(({ heading, body }) => (
          <div key={heading} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 12, color: 'var(--text)' }}>{heading}</h2>
            {body.split('\n\n').map((para, i) => (
              <p key={i} style={{ fontSize: 15, color: 'rgba(240,239,232,0.75)', lineHeight: 1.8, marginBottom: 12, whiteSpace: 'pre-line' }}>{para}</p>
            ))}
          </div>
        ))}

        <div style={{ padding: '24px', background: 'var(--bg2)', border: '1px solid rgba(139,124,246,0.2)', borderRadius: 'var(--radius)', marginTop: 24 }}>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.6)', lineHeight: 1.7, textAlign: 'center' }}>
            <strong style={{ color: 'var(--accent)' }}>Murmur is peer support — not therapy.</strong><br />
            If you are in crisis, please call Lifeline on 13 11 14.
          </p>
        </div>
      </div>
    </div>
  )
}