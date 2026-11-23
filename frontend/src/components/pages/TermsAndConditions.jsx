import React from 'react';
import { useNavigate } from 'react-router-dom';
import './TermsAndConditions.css';

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="terms-container">
      <div className="terms-card">
        {/* Header */}
        <div className="terms-header">
          <button className="back-button" onClick={() => navigate('/login')} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor"/>
            </svg>
          </button>
          <div className="terms-logo">
            <img
              src="/favicon.ico"
              alt="AgriScan AI Logo"
              style={{ width: "2.5rem", height: "2.5rem" }}
            />
          </div>
          <h1 className="terms-title">Terms and Conditions</h1>
          <p className="terms-subtitle">Last Updated: January 14, 2026</p>
        </div>

        {/* Content */}
        <div className="terms-content">
          <section className="terms-section">
            <h2 className="section-title">1. Acceptance of Terms</h2>
            <p className="section-text">
              By accessing and using AgriScan AI ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">2. Description of Service</h2>
            <p className="section-text">
              AgriScan AI provides a comprehensive farm management solution that includes:
            </p>
            <ul className="section-list">
              <li>Disease detection and analysis for crops</li>
              <li>Carbon analytics and environmental monitoring</li>
              <li>Farmer data management and insights</li>
              <li>Financial tracking and payment systems</li>
              <li>AI-powered chatbot assistance</li>
              <li>Knowledge base and educational resources</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">3. User Accounts</h2>
            <p className="section-text">
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="section-list">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">4. Privacy and Data Protection</h2>
            <p className="section-text">
              We take your privacy seriously. Our collection and use of personal information is governed by our Privacy Policy. By using the Service, you consent to:
            </p>
            <ul className="section-list">
              <li>The collection and processing of your data as described in our Privacy Policy</li>
              <li>The use of cookies and similar technologies to enhance your experience</li>
              <li>The storage and processing of data which may include farm data, images, and analytics</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">5. User Conduct</h2>
            <p className="section-text">
              You agree not to:
            </p>
            <ul className="section-list">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Infringe upon the rights of others</li>
              <li>Transmit any viruses, malware, or other malicious code</li>
              <li>Attempt to gain unauthorized access to any portion of the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">6. Intellectual Property</h2>
            <p className="section-text">
              The Service and its original content, features, and functionality are owned by AgriScan AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="section-text">
              You retain all rights to any data you submit to the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content solely for the purpose of providing the Service.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">7. AI-Generated Content</h2>
            <p className="section-text">
              Our Service uses artificial intelligence for disease detection, analytics, and recommendations. You acknowledge that:
            </p>
            <ul className="section-list">
              <li>AI-generated results are provided for informational purposes only</li>
              <li>Results should not be considered as professional agricultural advice</li>
              <li>You should verify critical decisions with qualified agricultural professionals</li>
              <li>We do not guarantee 100% accuracy of AI predictions or recommendations</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">8. Payment and Subscription</h2>
            <p className="section-text">
              Some features of the Service may require payment. By subscribing to a paid plan:
            </p>
            <ul className="section-list">
              <li>You agree to pay all fees associated with your subscription</li>
              <li>Fees are non-refundable unless required by law</li>
              <li>We reserve the right to change pricing with advance notice</li>
              <li>Your subscription will auto-renew unless cancelled</li>
            </ul>
          </section>

          <section className="terms-section">
            <h2 className="section-title">9. Limitation of Liability</h2>
            <p className="section-text">
              To the maximum extent permitted by law, AgriScan AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">10. Termination</h2>
            <p className="section-text">
              We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">11. Changes to Terms</h2>
            <p className="section-text">
              We reserve the right to modify these terms at any time. We will provide notice of significant changes by posting the updated terms on the Service. Your continued use of the Service after changes constitutes acceptance of the modified terms.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">12. Governing Law</h2>
            <p className="section-text">
              These Terms shall be governed by and construed in accordance with the laws of Kenya, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">13. Contact Information</h2>
            <p className="section-text">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="contact-info">
              <p><strong>Email:</strong> support@agriscanai.co.ke</p>
              <p><strong>Website:</strong> https://agriscanai.co.ke</p>
            </div>
          </section>

          <section className="terms-section">
            <h2 className="section-title">14. Severability</h2>
            <p className="section-text">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
            </p>
          </section>

          <section className="terms-section">
            <h2 className="section-title">15. Entire Agreement</h2>
            <p className="section-text">
              These Terms constitute the entire agreement between you and AgriScan AI regarding the use of the Service, superseding any prior agreements between you and AgriScan AI relating to your use of the Service.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="terms-footer">
          <p className="footer-text">
            By clicking "Create Account" or "Sign In", you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>
          <button className="accept-button" onClick={() => navigate(-1)}>
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
