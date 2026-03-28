export default function PrivacyPage() {
  return (
    <div className="privacy-screen">
      <div className="privacy-body">
        <h1 className="privacy-title">Privacy Notice</h1>
        <p className="privacy-updated">Last updated: March 2026</p>

        <section className="privacy-section">
          <h2>What is Togetherly?</h2>
          <p>Togetherly is a private family app that lets an elderly or disabled person share how they are doing with their family or carer. It is not a commercial service and is intended for personal, household use only.</p>
        </section>

        <section className="privacy-section">
          <h2>What information do we store?</h2>
          <ul>
            <li><strong>Your name</strong> — so family members know who is checking in.</li>
            <li><strong>Check-in status</strong> — whether you said you are okay, need help, or sent an SOS alert.</li>
            <li><strong>Mood</strong> — how you said you were feeling (for example, Happy or Tired). This is wellbeing information and is treated with care.</li>
            <li><strong>Needs</strong> — any requests you shared, such as shopping or bill help.</li>
            <li><strong>Device push token</strong> — a code that lets us send notifications to a family member&apos;s phone. This is linked to their device, not their identity.</li>
            <li><strong>Timestamps</strong> — the date and time of each check-in.</li>
          </ul>
          <p>We do not store passwords, email addresses, phone numbers, location data, or any financial information.</p>
        </section>

        <section className="privacy-section">
          <h2>Why do we store it?</h2>
          <p>The only reason we store this information is to show your family how you are doing and to send them notifications when you check in or need help. We do not use it for advertising, analytics, or any other purpose.</p>
        </section>

        <section className="privacy-section">
          <h2>Who can see it?</h2>
          <p>Only people who have your 6-letter family code can see your information. Keep your family code private and only share it with people you trust.</p>
          <p>We do not share your information with any third parties, advertisers, or other organisations.</p>
        </section>

        <section className="privacy-section">
          <h2>How long do we keep it?</h2>
          <ul>
            <li><strong>Check-in history</strong> is automatically deleted after 90 days.</li>
            <li><strong>Your name and current status</strong> are kept until you delete your data or leave the family.</li>
            <li><strong>Push notification tokens</strong> are removed automatically if they become invalid or when you delete your data.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Where is it stored?</h2>
          <p>Your data is stored securely using Supabase, a cloud database service. It may be stored on servers outside the United Kingdom. Supabase complies with UK GDPR as a data processor.</p>
        </section>

        <section className="privacy-section">
          <h2>Your rights</h2>
          <p>Under UK data protection law, you have the right to:</p>
          <ul>
            <li><strong>See your data</strong> — your current status and history are visible in the app.</li>
            <li><strong>Delete your data</strong> — go to Settings → Delete all my data. This permanently removes everything from our servers.</li>
            <li><strong>Leave without deleting</strong> — go to Settings → Leave this family. This removes the app from your device but leaves data intact for other family members.</li>
            <li><strong>Correct your name</strong> — go to Settings → Display name.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Mood and wellbeing information</h2>
          <p>Information about how you are feeling (such as marking yourself as Sad or Not Well) may be considered health-related data under UK law. By agreeing to use Togetherly, you give your explicit consent for this information to be shared with connected family members. You can change or remove this information at any time.</p>
        </section>

        <section className="privacy-section">
          <h2>Contact</h2>
          <p>Togetherly is a private family app. If you have any questions or concerns about your data, please speak directly with the family member who set up the app.</p>
        </section>
      </div>
    </div>
  );
}
