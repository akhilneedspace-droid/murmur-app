import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 12 }}>Privacy Policy</h1>
          <p style={{ fontSize: 14, color: 'rgba(240,239,232,0.5)' }}>Last updated: {date}</p>
        </div>

        {[
          {
            heading: '1. Who we are',
            body: `Murmur is an Australian peer support platform. We are committed to protecting your privacy in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs).\n\nThis policy explains what information we collect, how we use it, and how we protect it.`
          },
          {
            heading: '2. What we collect',
            body: `When you create an account, we collect:\n• Your name\n• Email address\n• Phone number (for verification)\n• Your Murmur identity (Carrier, Anchor, or Wanderer)\n• Profile photo (if you choose to upload one)\n\nWhen you use the platform, we also collect:\n• Content you post as an Expresser\n• Messages exchanged in listening sessions\n• Session metadata (when sessions started, ended, ratings given)\n• Your role preferences and settings`
          },
          {
            heading: '3. How we use your information',
            body: `We use your information to:\n• Provide and operate the Murmur platform\n• Verify your identity and prevent fake accounts\n• Match you with other community members\n• Monitor for safety and moderate content\n• Improve the platform over time\n\nWe do NOT use your information to:\n• Sell or share your data with advertisers\n• Build advertising profiles\n• Disclose your identity to other users without your consent (unless required by law)`
          },
          {
            heading: '4. Anonymity on Murmur',
            body: `When you choose to post anonymously, your name is hidden from other users. However, your account identity is always known to us internally. This is necessary for safety, moderation, and to investigate reports of harmful behaviour.\n\nYour anonymous posts are linked to your account in our database for the above purposes only.`
          },
          {
            heading: '5. AI processing',
            body: `When an AI listener is used (powered by Anthropic's Claude API), the content of your messages is sent to Anthropic's servers for processing. This is governed by Anthropic's privacy policy. We send only the conversation content necessary to generate a response — we do not send your name, email, or other personal details to Anthropic.\n\nAnthopic's privacy policy is available at anthropic.com/privacy.`
          },
          {
            heading: '6. Data retention',
            body: `We retain your account information for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where we are required to retain it by law or for legitimate safety purposes.\n\nConversations that you "delete" from your dashboard are soft-deleted — they are removed from your view but retained in our database for safety and moderation purposes for up to 12 months.`
          },
          {
            heading: '7. Third-party services',
            body: `We use the following third-party services to operate Murmur:\n• Supabase — database and authentication (servers in the United States)\n• Anthropic — AI processing (servers in the United States)\n• Vercel — hosting (servers in the United States)\n\nBy using Murmur, you consent to your data being processed in the United States by these providers, each of whom maintains appropriate data protection standards.`
          },
          {
            heading: '8. Your rights',
            body: `Under the Australian Privacy Act, you have the right to:\n• Access the personal information we hold about you\n• Request correction of inaccurate information\n• Make a complaint about how we handle your information\n\nTo exercise any of these rights, contact us through the platform or via the email in your account settings. We will respond within 30 days.\n\nIf you are unhappy with our response, you may contact the Office of the Australian Information Commissioner (OAIC) at oaic.gov.au.`
          },
          {
            heading: '9. Security',
            body: `We take reasonable steps to protect your personal information from misuse, interference, and loss, and from unauthorised access, modification, or disclosure. This includes encrypted data storage, verified account requirements, and access controls.\n\nHowever, no internet platform is completely secure. You use Murmur at your own risk.`
          },
          {
            heading: '10. Changes to this policy',
            body: `We may update this Privacy Policy from time to time. If we make material changes, we will notify you by email or through the platform. Continued use of Murmur after changes take effect constitutes acceptance of the updated policy.`
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
            Questions about your privacy? Contact us through the platform.<br />
            <strong style={{ color: 'var(--accent)' }}>Your data belongs to you.</strong>
          </p>
        </div>
      </div>
    </div>
  )
}