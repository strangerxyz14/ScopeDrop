import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, Users, Globe, Mail, AlertCircle, FileText } from "lucide-react";

const PrivacyPolicy = () => {
  const lastUpdated = "January 1, 2025";
  const effectiveDate = "January 1, 2025";

  return (
    <>
      <SEO
        title="Privacy Policy - ScopeDrop"
        description="Learn how ScopeDrop collects, uses, and protects your personal information. Our comprehensive privacy policy covers GDPR, CCPA compliance and your data rights."
        keywords={["privacy policy", "data protection", "GDPR", "CCPA", "personal data", "cookies"]}
        canonical="/privacy-policy"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-gray-600">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last Updated: {lastUpdated} | Effective Date: {effectiveDate}
            </p>
          </div>

          {/* Table of Contents */}
          <Card className="mb-8 p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Table of Contents
            </h2>
            <nav className="space-y-2">
              <a href="#introduction" className="block text-blue-600 hover:text-blue-800 hover:underline">1. Introduction and Scope</a>
              <a href="#information-collected" className="block text-blue-600 hover:text-blue-800 hover:underline">2. Information We Collect</a>
              <a href="#how-we-use" className="block text-blue-600 hover:text-blue-800 hover:underline">3. How We Use Your Information</a>
              <a href="#legal-basis" className="block text-blue-600 hover:text-blue-800 hover:underline">4. Legal Basis for Processing</a>
              <a href="#data-storage" className="block text-blue-600 hover:text-blue-800 hover:underline">5. Data Storage and Retention</a>
              <a href="#cookies" className="block text-blue-600 hover:text-blue-800 hover:underline">6. Cookies and Tracking Technologies</a>
              <a href="#third-parties" className="block text-blue-600 hover:text-blue-800 hover:underline">7. Sharing with Third Parties</a>
              <a href="#international" className="block text-blue-600 hover:text-blue-800 hover:underline">8. International Data Transfers</a>
              <a href="#security" className="block text-blue-600 hover:text-blue-800 hover:underline">9. Security Measures</a>
              <a href="#your-rights" className="block text-blue-600 hover:text-blue-800 hover:underline">10. Your Data Protection Rights</a>
              <a href="#children" className="block text-blue-600 hover:text-blue-800 hover:underline">11. Children's Privacy</a>
              <a href="#changes" className="block text-blue-600 hover:text-blue-800 hover:underline">12. Changes to This Policy</a>
              <a href="#contact" className="block text-blue-600 hover:text-blue-800 hover:underline">13. Contact Information</a>
            </nav>
          </Card>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* 1. Introduction and Scope */}
            <section id="introduction" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">1. Introduction and Scope</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    ScopeDrop ("we," "our," or "us") is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our services, or interact with us in any way.
                  </p>
                  <p className="mb-4">
                    This policy applies to all information collected through our website (https://scopedrop.com), mobile applications, email communications, and any other services we provide (collectively, our "Services"). By using our Services, you consent to the data practices described in this policy.
                  </p>
                  <p className="mb-4">
                    We comply with applicable data protection laws including the General Data Protection Regulation (GDPR) for European Union residents, the California Consumer Privacy Act (CCPA) for California residents, and other relevant privacy regulations worldwide.
                  </p>
                </div>
              </Card>
            </section>

            {/* 2. Information We Collect */}
            <section id="information-collected" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Eye className="w-6 h-6 mr-2" />
                  2. Information We Collect
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Personal Data You Provide</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Account Information:</strong> Name, email address, username, password, profile picture</li>
                    <li><strong>Contact Information:</strong> Phone number, mailing address (if provided)</li>
                    <li><strong>Payment Information:</strong> Credit card details, billing address (processed securely through third-party payment processors)</li>
                    <li><strong>Communications:</strong> Messages, feedback, support requests, and other communications you send to us</li>
                    <li><strong>Preferences:</strong> Your preferences, interests, and customization settings</li>
                    <li><strong>Professional Information:</strong> Company name, job title, industry (if applicable)</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Information Collected Automatically</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, mobile network information</li>
                    <li><strong>Usage Data:</strong> Pages visited, time spent on pages, clicks, search queries, referring/exit pages</li>
                    <li><strong>Location Data:</strong> Approximate geographic location based on IP address</li>
                    <li><strong>Cookies and Similar Technologies:</strong> Session cookies, persistent cookies, web beacons, pixel tags</li>
                    <li><strong>Log Data:</strong> Server logs containing IP addresses, access times, and system activity</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Information from Third Parties</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Social Media:</strong> Information from social media platforms when you connect your accounts</li>
                    <li><strong>Analytics Providers:</strong> Aggregated demographic and interest data</li>
                    <li><strong>Business Partners:</strong> Information from our partners when you interact with their services</li>
                    <li><strong>Public Sources:</strong> Publicly available information relevant to our services</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* 3. How We Use Your Information */}
            <section id="how-we-use" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">We use the information we collect for the following purposes:</p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 Service Delivery</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Provide, maintain, and improve our Services</li>
                    <li>Process transactions and send transaction notifications</li>
                    <li>Respond to your comments, questions, and requests</li>
                    <li>Send you technical notices, updates, security alerts, and support messages</li>
                    <li>Personalize and customize your experience</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Communications</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Send newsletters, marketing communications, and promotional materials (with your consent)</li>
                    <li>Communicate about new features, products, or services</li>
                    <li>Conduct surveys and collect feedback</li>
                    <li>Send administrative information about policy changes</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Analytics and Improvement</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Monitor and analyze trends, usage, and activities</li>
                    <li>Measure the effectiveness of our Services</li>
                    <li>Develop new products, services, and features</li>
                    <li>Conduct research and analysis</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.4 Legal and Security</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Comply with legal obligations and regulatory requirements</li>
                    <li>Protect against fraudulent, illegal, or harmful activities</li>
                    <li>Enforce our terms and conditions</li>
                    <li>Protect our rights, privacy, safety, and property</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* 4. Legal Basis for Processing */}
            <section id="legal-basis" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">4. Legal Basis for Processing (GDPR)</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    If you are in the European Economic Area (EEA), we process your personal data based on the following legal grounds:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Consent:</strong> You have given clear consent for us to process your personal data for specific purposes</li>
                    <li><strong>Contract:</strong> Processing is necessary for the performance of a contract with you or to take steps at your request before entering into a contract</li>
                    <li><strong>Legal Obligation:</strong> Processing is necessary for compliance with a legal obligation</li>
                    <li><strong>Vital Interests:</strong> Processing is necessary to protect someone's life</li>
                    <li><strong>Public Task:</strong> Processing is necessary to perform a task in the public interest</li>
                    <li><strong>Legitimate Interests:</strong> Processing is necessary for our legitimate interests or those of a third party, unless overridden by your fundamental rights and freedoms</li>
                  </ul>
                  <p className="mb-4">
                    Our legitimate interests include providing and improving our Services, understanding how users interact with our Services, ensuring security, preventing fraud, and conducting business operations.
                  </p>
                </div>
              </Card>
            </section>

            {/* 5. Data Storage and Retention */}
            <section id="data-storage" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Lock className="w-6 h-6 mr-2" />
                  5. Data Storage and Retention
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Data Storage</h3>
                  <p className="mb-4">
                    Your information is stored on secure servers located in the United States and may be transferred to and processed in countries other than your country of residence. We use industry-standard encryption and security measures to protect data in transit and at rest.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Retention Periods</h3>
                  <p className="mb-4">We retain your personal data for as long as necessary to:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Provide you with our Services</li>
                    <li>Comply with legal obligations (typically 7 years for financial records)</li>
                    <li>Resolve disputes and enforce agreements</li>
                    <li>Conduct legitimate business purposes</li>
                  </ul>
                  
                  <p className="mb-4">
                    When determining retention periods, we consider the amount, nature, and sensitivity of the data, potential risk of harm, the purposes for processing, and applicable legal requirements.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.3 Account Deletion</h3>
                  <p className="mb-4">
                    You may request deletion of your account at any time. Upon account deletion, we will delete or anonymize your personal data within 30 days, except where retention is necessary for legal obligations or legitimate business purposes.
                  </p>
                </div>
              </Card>
            </section>

            {/* 6. Cookies and Tracking Technologies */}
            <section id="cookies" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">6. Cookies and Tracking Technologies</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Types of Cookies We Use</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Essential Cookies:</strong> Required for the operation of our Services</li>
                    <li><strong>Performance Cookies:</strong> Help us understand how visitors interact with our Services</li>
                    <li><strong>Functionality Cookies:</strong> Remember your preferences and personalize your experience</li>
                    <li><strong>Marketing Cookies:</strong> Track your online activity to help advertisers deliver more relevant advertising</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.2 Third-Party Cookies</h3>
                  <p className="mb-4">
                    We use services from third parties that may place cookies on your device:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Google Analytics for usage analytics</li>
                    <li>Social media plugins for content sharing</li>
                    <li>Advertising partners for targeted advertising</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Managing Cookies</h3>
                  <p className="mb-4">
                    You can control cookies through your browser settings and opt-out tools:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Most browsers allow you to refuse or delete cookies</li>
                    <li>You can opt-out of Google Analytics by installing the Google Analytics Opt-out Browser Add-on</li>
                    <li>You can opt-out of interest-based advertising through the Network Advertising Initiative or Digital Advertising Alliance</li>
                  </ul>
                  
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                    <p className="text-sm">
                      <strong>Note:</strong> Disabling cookies may affect the functionality of our Services.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* 7. Sharing with Third Parties */}
            <section id="third-parties" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  7. Sharing with Third Parties
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">We may share your information in the following circumstances:</p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">7.1 Service Providers</h3>
                  <p className="mb-4">
                    We share information with third-party service providers who perform services on our behalf:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Payment processors for transaction processing</li>
                    <li>Cloud hosting providers for data storage</li>
                    <li>Email service providers for communications</li>
                    <li>Analytics providers for usage analysis</li>
                    <li>Customer support tools for service delivery</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.2 Business Transfers</h3>
                  <p className="mb-4">
                    In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your information may be transferred as part of that transaction.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.3 Legal Requirements</h3>
                  <p className="mb-4">
                    We may disclose your information if required to do so by law or in response to valid requests by public authorities, including:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Court orders and subpoenas</li>
                    <li>Government and regulatory requests</li>
                    <li>Law enforcement requests</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.4 Consent</h3>
                  <p className="mb-4">
                    We may share your information with your consent or at your direction.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.5 Aggregated or Anonymized Data</h3>
                  <p className="mb-4">
                    We may share aggregated or anonymized information that cannot reasonably be used to identify you.
                  </p>
                </div>
              </Card>
            </section>

            {/* 8. International Data Transfers */}
            <section id="international" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Globe className="w-6 h-6 mr-2" />
                  8. International Data Transfers
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws different from those in your country.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">8.1 Safeguards</h3>
                  <p className="mb-4">
                    When we transfer personal data internationally, we implement appropriate safeguards:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Standard Contractual Clauses approved by the European Commission</li>
                    <li>Adequacy decisions by relevant data protection authorities</li>
                    <li>Binding Corporate Rules for intra-group transfers</li>
                    <li>Your explicit consent to the transfer</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.2 Privacy Shield</h3>
                  <p className="mb-4">
                    Although the EU-U.S. Privacy Shield Framework has been invalidated, we continue to comply with the Privacy Shield Principles for personal data previously received in reliance on the Privacy Shield.
                  </p>
                </div>
              </Card>
            </section>

            {/* 9. Security Measures */}
            <section id="security" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Lock className="w-6 h-6 mr-2" />
                  9. Security Measures
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    We implement appropriate technical and organizational security measures to protect your personal data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access.
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">Our Security Measures Include:</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Encryption of data in transit using TLS/SSL protocols</li>
                    <li>Encryption of sensitive data at rest</li>
                    <li>Regular security assessments and penetration testing</li>
                    <li>Access controls and authentication mechanisms</li>
                    <li>Employee training on data protection and security</li>
                    <li>Incident response and breach notification procedures</li>
                    <li>Regular backups and disaster recovery plans</li>
                    <li>Physical security measures for data centers</li>
                  </ul>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                    <p className="text-sm">
                      <strong>Your Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for any activities that occur under your account. Please notify us immediately of any unauthorized use.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* 10. Your Data Protection Rights */}
            <section id="your-rights" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">10. Your Data Protection Rights</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">10.1 Rights Under GDPR (European Users)</h3>
                  <p className="mb-4">If you are in the EEA, you have the following rights:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Access:</strong> Request a copy of your personal data</li>
                    <li><strong>Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                    <li><strong>Erasure:</strong> Request deletion of your personal data ("right to be forgotten")</li>
                    <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                    <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                    <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                    <li><strong>Automated Decision-Making:</strong> Not be subject to decisions based solely on automated processing</li>
                    <li><strong>Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">10.2 Rights Under CCPA (California Residents)</h3>
                  <p className="mb-4">If you are a California resident, you have the following rights:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li><strong>Right to Know:</strong> Request information about the personal information we collect, use, and disclose</li>
                    <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                    <li><strong>Right to Opt-Out:</strong> Opt-out of the sale of your personal information (we do not sell personal information)</li>
                    <li><strong>Right to Non-Discrimination:</strong> Not be discriminated against for exercising your privacy rights</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">10.3 How to Exercise Your Rights</h3>
                  <p className="mb-4">
                    To exercise any of these rights, please contact us using the contact information provided below. We will respond to your request within the timeframe required by applicable law (typically within 30 days).
                  </p>
                  
                  <p className="mb-4">
                    We may need to verify your identity before processing your request. We will not discriminate against you for exercising your rights.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">10.4 Lodging Complaints</h3>
                  <p className="mb-4">
                    If you believe we have violated your privacy rights, you have the right to lodge a complaint with your local data protection authority or supervisory authority.
                  </p>
                </div>
              </Card>
            </section>

            {/* 11. Children's Privacy */}
            <section id="children" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <AlertCircle className="w-6 h-6 mr-2" />
                  11. Children's Privacy
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    Our Services are not directed to children under the age of 16 (or such higher age as required by applicable law). We do not knowingly collect personal information from children under 16.
                  </p>
                  
                  <p className="mb-4">
                    If you are a parent or guardian and believe we have collected information from your child without consent, please contact us immediately. We will take steps to delete such information from our systems.
                  </p>
                  
                  <p className="mb-4">
                    If we learn that we have collected personal information from a child under 16 without verification of parental consent, we will delete that information as quickly as possible.
                  </p>
                </div>
              </Card>
            </section>

            {/* 12. Changes to This Policy */}
            <section id="changes" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">12. Changes to This Policy</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, and other factors. We will notify you of any material changes by:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Posting the updated policy on our website with a new "Last Updated" date</li>
                    <li>Sending you an email notification (for registered users)</li>
                    <li>Displaying a prominent notice on our Services</li>
                  </ul>
                  
                  <p className="mb-4">
                    We encourage you to review this Privacy Policy periodically to stay informed about our data practices. Your continued use of our Services after any changes indicates your acceptance of the updated policy.
                  </p>
                </div>
              </Card>
            </section>

            {/* 13. Contact Information */}
            <section id="contact" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Mail className="w-6 h-6 mr-2" />
                  13. Contact Information
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2"><strong>ScopeDrop Privacy Team</strong></p>
                    <p className="mb-2">Email: privacy@scopedrop.com</p>
                    <p className="mb-2">Address: 123 Tech Street, San Francisco, CA 94105, USA</p>
                    <p className="mb-2">Phone: +1 (555) 123-4567</p>
                  </div>

                  <h3 className="text-xl font-semibold mt-4 mb-2">Data Protection Officer</h3>
                  <p className="mb-4">
                    For GDPR-related inquiries, you may also contact our Data Protection Officer:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">Email: dpo@scopedrop.com</p>
                  </div>

                  <h3 className="text-xl font-semibold mt-4 mb-2">EU Representative</h3>
                  <p className="mb-4">
                    For EU residents, our appointed representative for data protection matters is:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">ScopeDrop EU Representative</p>
                    <p className="mb-2">Address: [EU Representative Address]</p>
                    <p className="mb-2">Email: eu-privacy@scopedrop.com</p>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default PrivacyPolicy;