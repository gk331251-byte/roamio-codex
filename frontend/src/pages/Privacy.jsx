import React from 'react';

const Privacy = () => (
  <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm font-sans">
    <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
    <p>Last updated: July 23, 2025</p>

    <section>
      <h2 className="mt-6 text-xl font-semibold">1. What We Collect</h2>
      <ul className="list-disc list-inside ml-4">
        <li>Google account info (email, name)</li>
        <li>GPS location data (with permission) — treated as personal data per GDPR/CCPA :contentReference[oaicite:11]{index=11}</li>
        <li>Quest activity, timestamps, mood preferences</li>
        <li>Device & browser metadata (optional analytics tracking)</li>
      </ul>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">2. How We Use It</h2>
      <p>
        To generate quests, personalize experiences, improve the service, send updates,
        enforce Terms, and compile anonymous analytics.
      </p>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">3. Sharing with Third Parties</h2>
      <p>
        Shared only with:
        <ul className="list-disc list-inside ml-4">
          <li>OpenAI (for text/image generation)</li>
          <li>Google Maps & Places</li>
          <li>Firebase services</li>
        </ul>
        We do not sell data. California residents have a right to opt-out of "sale" under CCPA.
      </p>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">4. Data Storage & Retention</h2>
      <p>
        Stored securely in Firestore. Retained while your account exists. You may request deletion.
      </p>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">5. Your Rights (GDPR/CCPA)</h2>
      <ul className="list-disc list-inside ml-4">
        <li>Access your data</li>
        <li>Delete your data (“Delete My Account” feature forthcoming)</li>
        <li>Opt-out of location or analytics at any time</li>
      </ul>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">6. Children’s Privacy</h2>
      <p>
        Do not use if under 13. We do not knowingly collect data from minors under 13 :contentReference[oaicite:12]{index=12}.
      </p>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">7. Cookies & Tracking</h2>
      <p>
        May use cookies for functionality and analytics. EU users will see consent banner per GDPR :contentReference[oaicite:13]{index=13}.
      </p>
    </section>

    <section>
      <h2 className="mt-6 text-xl font-semibold">8. Changes to Policy</h2>
      <p>
        Updates will be posted here. Major changes notified via email or in-app.
      </p>
    </section>

    <p className="mt-8 text-sm text-gray-500">
      Questions or data deletion requests? Email support@roamio.app
    </p>
  </div>
);

export default Privacy;

