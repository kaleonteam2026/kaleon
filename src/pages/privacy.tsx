export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--app-page-bg, #050c18)", color: "var(--app-text, #e2e8f0)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight uppercase mb-2" style={{ color: "#f8fafc" }}>
          Kaleon Privacy Policy
        </h1>
        <p className="text-xs pwc-font-mono uppercase tracking-wider mb-8" style={{ color: "#4ECCA3", opacity: 0.7 }}>
          Effective Date: June 1, 2026 &nbsp;|&nbsp; Last Updated: June 1, 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
          <p>
            Kaleon LLC ("Kaleon," "we," "our," or "us") is committed to protecting the privacy and security of
            our users. This Privacy Policy explains what information we collect, how we use it, how we protect
            it, and the choices available to you regarding your information.
          </p>
          <p>
            By using Kaleon, you agree to the practices described in this Privacy Policy. If you do not agree
            with this Privacy Policy, please do not use our platform.
          </p>

          <Section title="1. Who We Are">
            <p>
              Kaleon LLC is a California-formed educational planning platform designed to help students better
              understand their academic progress, transfer readiness, course pathways, and educational
              opportunities. Kaleon provides informational recommendations and planning tools and is not a
              substitute for official academic advising.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p>Information we collect falls into two categories: information you voluntarily provide and information
            automatically collected when you use our platform.</p>

            <SubSection title="Account Information">
              <p>When you create an account, we may collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Date of birth or age (to verify minimum age eligibility)</li>
                <li>Account credentials managed through our authentication provider (Supabase)</li>
              </ul>
            </SubSection>

            <SubSection title="Academic Information">
              <p>To provide educational planning services, we may collect:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Courses completed and semester history</li>
                <li>Grades and GPA information</li>
                <li>Intended transfer institutions</li>
                <li>Academic interests and career goals</li>
                <li>Educational preferences</li>
              </ul>
            </SubSection>

            <SubSection title="Transcript Information">
              <p>
                Users may choose to upload transcripts to help populate academic information within Kaleon.
                When transcripts are processed, Kaleon extracts relevant educational data such as courses
                completed, grades and GPA information, and semester history.
              </p>
              <p className="mt-2">
                Kaleon does not intentionally collect or use unnecessary personal identifiers from uploaded
                transcripts. Users should not upload documents containing Social Security numbers, tax returns,
                bank account details, credit card information, or driver's license information.
              </p>
            </SubSection>

            <SubSection title="Community College (CC) Data">
              <p>
                We may collect data associated with a student's community college enrollment, including course
                records, program information, and transfer pathway data, to facilitate educational planning
                recommendations.
              </p>
            </SubSection>

            <SubSection title="Financial Preference Information">
              <p>
                Users may optionally provide general financial preference information, such as whether
                affordability or financial aid opportunities are important factors in their educational planning.
                Kaleon does not collect Social Security numbers, tax returns, bank account information, credit
                card numbers, or driver's license information, and users should not submit such documents to the
                platform.
              </p>
            </SubSection>

            <SubSection title="Feedback Information">
              <p>
                We may collect information submitted through surveys, feedback forms, beta testing
                questionnaires, bug reports, and support requests.
              </p>
            </SubSection>

            <SubSection title="Analytics and Log Data">
              <p>
                We automatically collect certain usage information through Google Analytics and our
                infrastructure provider Cloudflare, including device and browser information, IP address,
                pages visited, time spent, and general usage patterns, feature engagement metrics, and error
                logs and technical diagnostics.
              </p>
              <p className="mt-2">
                While this information may not be personally identifying by itself, it may be possible to
                combine it with other data to identify individual users. We use this information to improve
                the platform and user experience.
              </p>
            </SubSection>

            <SubSection title="Cookies">
              <p>Kaleon uses the following cookies and similar tracking technologies:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Google Analytics cookies, which collect anonymized usage and behavior data to help us improve the platform.</li>
                <li>Cloudflare security cookies, which are automatically set by Cloudflare to protect the platform from malicious traffic and ensure reliable service delivery.</li>
              </ul>
              <p className="mt-2">
                We do not use advertising cookies or tracking pixels. You may configure your browser to refuse
                cookies; however, some platform features may not function correctly as a result.
              </p>
            </SubSection>
          </Section>

          <Section title="3. Sensitive Information">
            <p>
              Under the California Privacy Rights Act (CPRA), certain categories of personal information are
              classified as "sensitive" and are afforded heightened protection. The following information we
              collect may qualify as sensitive:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Academic transcript data, including grades and GPA</li>
              <li>Age or date of birth</li>
              <li>Community college enrollment and course history</li>
            </ul>
            <p className="mt-2">
              Kaleon collects sensitive information solely to provide the educational planning services
              described in this Privacy Policy. We do not use sensitive personal information to infer
              characteristics about you, for advertising, or for any purpose beyond what is reasonably
              necessary to deliver and improve our services.
            </p>
          </Section>

          <Section title="4. How We Use Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Create and maintain user accounts</li>
              <li>Generate academic planning and transfer readiness recommendations</li>
              <li>Create course pathway and educational opportunity recommendations</li>
              <li>Improve platform functionality, reliability, and user experience</li>
              <li>Respond to support requests and feedback</li>
              <li>Conduct beta testing and product improvement research</li>
              <li>Maintain platform security and prevent fraud or abuse</li>
              <li>Communicate product updates, announcements, and policy changes</li>
              <li>Comply with applicable legal obligations</li>
            </ul>
            <p className="mt-2">
              We do not use your personal information for targeted advertising or sell it to third parties
              for marketing purposes.
            </p>
          </Section>

          <Section title="5. Counselor Access">
            <p>
              Student information remains private by default. Counselors may only access student information
              when a student explicitly requests counselor review or otherwise authorizes access through
              Kaleon.
            </p>
            <p className="mt-2">
              When authorized by a student, counselors may be able to view student name, academic history and
              GPA information, course pathways and recommendations, and educational planning information.
            </p>
            <p className="mt-2">
              Kaleon does not provide counselor access to student information without the student's prior
              authorization.
            </p>
          </Section>

          <Section title="6. Information Sharing">
            <p>
              Kaleon does not sell personal information. Kaleon does not share personal information with
              advertisers. We may share information only in the following limited circumstances:
            </p>

            <SubSection title="Service Providers">
              <p>We use the following trusted third-party providers to support platform operations:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Supabase &ndash; Database storage and backend infrastructure (United States)</li>
                <li>Cloudflare &ndash; Content delivery, security, and DDoS protection (global network)</li>
                <li>Google Analytics &ndash; Anonymized usage analytics</li>
              </ul>
              <p className="mt-2">
                These providers are contractually required to protect your information and may only use it to
                perform services on our behalf.
              </p>
            </SubSection>

            <SubSection title="Authorized Counselor Access">
              <p>
                Information may be shared with counselors only when explicitly authorized by the student, as
                described above.
              </p>
            </SubSection>

            <SubSection title="Legal Requirements">
              <p>
                We may disclose information when required by law, court order, subpoena, or valid governmental
                request, or when we believe disclosure is necessary to protect the rights, property, or safety
                of Kaleon, our users, or the public.
              </p>
            </SubSection>

            <SubSection title="Business Transactions">
              <p>
                If Kaleon undergoes a merger, acquisition, or sale of assets, user information may be
                transferred as part of that transaction. You will be notified of any such change, and any
                acquiring party will be required to honor the commitments made in this Privacy Policy.
              </p>
            </SubSection>
          </Section>

          <Section title="7. Do Not Sell or Share My Personal Information">
            <p>
              Kaleon does not sell your personal information to third parties. Kaleon does not share your
              personal information for cross-context behavioral advertising purposes. Because we do not
              engage in these activities, no opt-out mechanism for the sale or sharing of personal
              information is currently required.
            </p>
          </Section>

          <Section title="8. International Data Transfers">
            <p>
              Your personal information is stored in the United States using Supabase's infrastructure.
              However, because Kaleon uses Cloudflare to provide security and content delivery services,
              data may transiently pass through Cloudflare's global network of servers, which are located in
              countries outside the United States.
            </p>
            <p className="mt-2">
              Cloudflare is a participant in standard data protection frameworks and processes transient data
              in accordance with its privacy and security commitments. Kaleon does not intentionally
              transfer stored personal information to servers located outside the United States.
            </p>
          </Section>

          <Section title="9. FERPA Notice">
            <p>
              The Family Educational Rights and Privacy Act (FERPA) is a federal law that protects the
              privacy of student education records. Kaleon currently operates as a direct-to-student platform
              and is not acting as an agent of any educational institution. As a result, FERPA does not
              directly govern Kaleon's current operations.
            </p>
            <p className="mt-2">
              Any academic information you provide to Kaleon is provided voluntarily by you and is governed
              by this Privacy Policy. If and when Kaleon enters into partnerships with educational
              institutions, we will enter into appropriate data sharing agreements to comply with FERPA's
              requirements.
            </p>
          </Section>

          <Section title="10. Data Storage and Security">
            <p>We use commercially reasonable security measures designed to protect user information, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Encrypted data storage via Supabase</li>
              <li>HTTPS-secured communications across all platform interactions</li>
              <li>Cloudflare-provided DDoS protection and network security monitoring</li>
              <li>Access controls and limited employee access to personal data</li>
              <li>Regular security monitoring practices</li>
            </ul>
            <p className="mt-2">
              No method of electronic transmission or storage is 100% secure, and Kaleon cannot guarantee
              absolute data security.
            </p>
          </Section>

          <Section title="11. Data Retention">
            <p>We retain personal information as follows:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information and academic data are retained for the duration your account is active.</li>
              <li>Transcript data is retained until a verified account deletion request is received and processed.</li>
              <li>Analytics data (Google Analytics) is retained in accordance with Google's data retention settings.</li>
              <li>Support and feedback data is retained for the duration necessary to resolve your inquiry.</li>
            </ul>
            <p className="mt-2">
              We may retain aggregated and anonymized data indefinitely for platform improvement and research
              purposes.
            </p>
          </Section>

          <Section title="12. Data Deletion Requests">
            <p>
              Users may request deletion of their account and associated personal information by contacting
              Kaleon at support@kaleon.org. Verified deletion requests are generally processed within 30 days
              of verification.
            </p>
            <p className="mt-2">
              Upon deletion, Kaleon will remove or anonymize applicable personal information, subject to
              exceptions including retention required by law, legitimate business purposes, or aggregated
              data.
            </p>
          </Section>

          <Section title="13. Your Rights">
            <p>Subject to applicable law, you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Right to Know</strong> &ndash; Request information about the personal information we collect and use.</li>
              <li><strong>Right to Delete</strong> &ndash; Request deletion of your personal information.</li>
              <li><strong>Right to Correct</strong> &ndash; Request correction of inaccurate personal information.</li>
              <li><strong>Right to Data Portability</strong> &ndash; Request an export of personal information you have provided.</li>
              <li><strong>Right to Limit Use of Sensitive Personal Information</strong> &ndash; Direct us to limit use of sensitive data.</li>
              <li><strong>Right to Non-Discrimination</strong> &ndash; We will not discriminate against you for exercising your rights.</li>
            </ul>
          </Section>

          <Section title="14. California-Specific Disclosures">
            <p>
              The following provisions apply specifically to California residents in accordance with the
              CCPA and CPRA. Kaleon does not offer financial incentives in exchange for personal information.
              You may designate an authorized agent to submit privacy rights requests on your behalf.
            </p>

            <SubSection title="California Notice of Collection">
              <p>Kaleon has collected the following categories of personal information:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Identifiers &ndash; such as name, email address, IP address</li>
                <li>Personal records &ndash; such as age and account credentials</li>
                <li>Education information &ndash; such as grades, GPA, transcript data</li>
                <li>Commercial and preference information &ndash; such as financial aid preferences</li>
                <li>Internet or electronic network activity &ndash; usage patterns and device information</li>
                <li>Geolocation data &ndash; approximate location derived from IP address</li>
                <li>Inferences &ndash; such as transfer readiness assessments</li>
              </ul>
            </SubSection>

            <SubSection title="Shine the Light">
              <p>
                California residents may request information about personal information we disclose to third
                parties for their direct marketing purposes. Kaleon does not currently engage in such sharing.
              </p>
            </SubSection>

            <SubSection title="Do Not Track">
              <p>
                Kaleon does not currently respond to DNT signals. We adhere to the standards outlined in this
                Privacy Policy.
              </p>
            </SubSection>
          </Section>

          <Section title="15. Users Under 18">
            <p>
              Kaleon is designed for students aged 17 and older. We do not knowingly permit users under the
              age of 17 to create accounts. If we become aware that a user under age 17 has provided personal
              information, we will take steps to delete that information promptly. Because we do not knowingly
              collect information from children under 13, COPPA does not apply to our current operations.
            </p>
          </Section>

          <Section title="16. Future Institutional Partnerships">
            <p>
              Any future institutional data sharing will be subject to explicit prior notice to affected
              users, additional user consent where required by law, formal data sharing agreements consistent
              with applicable law, and updates to this Privacy Policy.
            </p>
          </Section>

          <Section title="17. Data Breach Notification">
            <p>
              In the event of a data breach, Kaleon will notify affected users within 72 hours of becoming
              aware of the breach, to the extent required by applicable law.
            </p>
          </Section>

          <Section title="18. Business Transfers">
            <p>
              If Kaleon or its assets are acquired, personal information may be transferred as part of that
              transaction. Any acquiring party will be required to assume the obligations set forth in this
              Privacy Policy.
            </p>
          </Section>

          <Section title="19. Limits of This Policy">
            <p>
              This Privacy Policy does not apply to third-party websites or services linked from Kaleon. We
              encourage you to review the privacy policies of any third-party sites you visit.
            </p>
          </Section>

          <Section title="20. Changes to This Privacy Policy">
            <p>
              We may update this Privacy Policy from time to time. If we make material changes, we will
              provide additional notice through the platform or by email. We will update this Privacy Policy
              at least once every 12 months as required by the CPRA.
            </p>
          </Section>

          <Section title="21. Contact Us">
            <p>If you have questions about this Privacy Policy, please contact us:</p>
            <div className="mt-2 space-y-1" style={{ color: "#4ECCA3" }}>
              <p>Email: <a href="mailto:support@kaleon.org" className="underline hover:no-underline">support@kaleon.org</a></p>
              <p>Company: Kaleon LLC</p>
              <p>State of Formation: California</p>
            </div>
            <p className="mt-2">
              For privacy rights requests, please include &ldquo;Privacy Rights Request&rdquo; in the subject line along
              with your full name and the email address associated with your Kaleon account.
            </p>
          </Section>

          <p className="pt-4 text-xs" style={{ color: "#64748b" }}>
            &copy; 2026 Kaleon LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold tracking-tight mb-3 mt-8" style={{ color: "#f8fafc" }}>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-2" style={{ color: "#e2e8f0" }}>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
