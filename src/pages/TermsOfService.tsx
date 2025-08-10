import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { FileText, Scale, Shield, AlertTriangle, Ban, Gavel, UserCheck, Mail } from "lucide-react";

const TermsOfService = () => {
  const lastUpdated = "January 1, 2025";
  const effectiveDate = "January 1, 2025";

  return (
    <>
      <SEO
        title="Terms of Service - ScopeDrop"
        description="Read our Terms of Service to understand the rules and guidelines for using ScopeDrop. Learn about your rights, responsibilities, and our service provisions."
        keywords={["terms of service", "terms and conditions", "user agreement", "legal terms", "service agreement"]}
        canonical="/terms"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Scale className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-lg text-gray-600">
              Please read these terms carefully before using our services.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last Updated: {lastUpdated} | Effective Date: {effectiveDate}
            </p>
          </div>

          {/* Important Notice */}
          <Card className="mb-8 p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold mb-2">Important Legal Notice</h2>
                <p className="text-sm text-gray-700">
                  By accessing or using ScopeDrop's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
                </p>
              </div>
            </div>
          </Card>

          {/* Table of Contents */}
          <Card className="mb-8 p-6 bg-purple-50 border-purple-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Table of Contents
            </h2>
            <nav className="space-y-2">
              <a href="#acceptance" className="block text-purple-600 hover:text-purple-800 hover:underline">1. Acceptance of Terms</a>
              <a href="#eligibility" className="block text-purple-600 hover:text-purple-800 hover:underline">2. Eligibility and Account Registration</a>
              <a href="#use-of-service" className="block text-purple-600 hover:text-purple-800 hover:underline">3. Use of Service</a>
              <a href="#user-content" className="block text-purple-600 hover:text-purple-800 hover:underline">4. User Content and Conduct</a>
              <a href="#intellectual-property" className="block text-purple-600 hover:text-purple-800 hover:underline">5. Intellectual Property Rights</a>
              <a href="#prohibited" className="block text-purple-600 hover:text-purple-800 hover:underline">6. Prohibited Activities</a>
              <a href="#third-party" className="block text-purple-600 hover:text-purple-800 hover:underline">7. Third-Party Services and Content</a>
              <a href="#payment" className="block text-purple-600 hover:text-purple-800 hover:underline">8. Payment Terms</a>
              <a href="#disclaimers" className="block text-purple-600 hover:text-purple-800 hover:underline">9. Disclaimers and Limitations of Liability</a>
              <a href="#indemnification" className="block text-purple-600 hover:text-purple-800 hover:underline">10. Indemnification</a>
              <a href="#termination" className="block text-purple-600 hover:text-purple-800 hover:underline">11. Termination</a>
              <a href="#governing-law" className="block text-purple-600 hover:text-purple-800 hover:underline">12. Governing Law and Dispute Resolution</a>
              <a href="#changes" className="block text-purple-600 hover:text-purple-800 hover:underline">13. Changes to Terms</a>
              <a href="#general" className="block text-purple-600 hover:text-purple-800 hover:underline">14. General Provisions</a>
              <a href="#contact" className="block text-purple-600 hover:text-purple-800 hover:underline">15. Contact Information</a>
            </nav>
          </Card>

          {/* Content Sections */}
          <div className="space-y-8">
            {/* 1. Acceptance of Terms */}
            <section id="acceptance" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <UserCheck className="w-6 h-6 mr-2" />
                  1. Acceptance of Terms
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and ScopeDrop, Inc. ("ScopeDrop," "we," "us," or "our") governing your use of the ScopeDrop website, mobile applications, and related services (collectively, the "Service").
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">1.1 Agreement to Terms</h3>
                  <p className="mb-4">
                    By accessing or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you are using our Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">1.2 Additional Terms</h3>
                  <p className="mb-4">
                    Certain features of the Service may be subject to additional terms and conditions. Such additional terms are incorporated into these Terms by reference. In the event of a conflict, the additional terms will prevail over these Terms for those specific features.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">1.3 Privacy Policy</h3>
                  <p className="mb-4">
                    Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection, use, and disclosure of your information as described in our Privacy Policy.
                  </p>
                </div>
              </Card>
            </section>

            {/* 2. Eligibility and Account Registration */}
            <section id="eligibility" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">2. Eligibility and Account Registration</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">2.1 Age Requirements</h3>
                  <p className="mb-4">
                    You must be at least 18 years old to use the Service. If you are under 18, you may only use the Service with the consent and supervision of a parent or legal guardian who agrees to be bound by these Terms. The Service is not intended for children under 13 years of age, and we do not knowingly collect personal information from children under 13.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Account Creation</h3>
                  <p className="mb-4">
                    To access certain features of the Service, you may need to create an account. When creating an account, you agree to:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain and promptly update your account information</li>
                    <li>Maintain the security and confidentiality of your login credentials</li>
                    <li>Accept responsibility for all activities that occur under your account</li>
                    <li>Immediately notify us of any unauthorized use of your account</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.3 Account Restrictions</h3>
                  <p className="mb-4">
                    You may not:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Create multiple accounts for the same individual or entity</li>
                    <li>Share your account credentials with others</li>
                    <li>Use another person's account without permission</li>
                    <li>Create an account using false or misleading information</li>
                    <li>Create an account if we have previously terminated your account</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">2.4 Business Accounts</h3>
                  <p className="mb-4">
                    If you register for a business account, you represent and warrant that you have the authority to bind your organization to these Terms, and your organization agrees to be responsible for your actions and omissions while using the Service.
                  </p>
                </div>
              </Card>
            </section>

            {/* 3. Use of Service */}
            <section id="use-of-service" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">3. Use of Service</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">3.1 License to Use</h3>
                  <p className="mb-4">
                    Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for your personal or internal business purposes. This license does not include any right to:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Resell or commercially use the Service or its contents</li>
                    <li>Collect or use any information for any unauthorized purpose</li>
                    <li>Create derivative works based on the Service</li>
                    <li>Download, copy, or distribute content except as expressly permitted</li>
                    <li>Use data mining, robots, or similar data gathering methods</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Service Availability</h3>
                  <p className="mb-4">
                    We strive to provide continuous access to the Service, but we do not guarantee that the Service will be available at all times. We may suspend, withdraw, discontinue, or change all or any part of the Service without notice. We will not be liable if the Service is unavailable at any time or for any period.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.3 Service Modifications</h3>
                  <p className="mb-4">
                    We reserve the right to modify, update, or discontinue the Service (or any part thereof) at any time, with or without notice. You agree that we shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">3.4 Beta Features</h3>
                  <p className="mb-4">
                    We may offer access to beta features or services that are still in development. Beta features are provided "as is" and "as available" without warranties of any kind. We may discontinue beta features at any time, and features may not be included in the final version of the Service.
                  </p>
                </div>
              </Card>
            </section>

            {/* 4. User Content and Conduct */}
            <section id="user-content" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">4. User Content and Conduct</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">4.1 User Content</h3>
                  <p className="mb-4">
                    The Service may allow you to submit, post, upload, or otherwise make available content including text, images, videos, comments, feedback, and other materials ("User Content"). You retain ownership of your User Content, but by submitting it, you grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable, transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform your User Content in connection with the Service.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">4.2 Content Responsibilities</h3>
                  <p className="mb-4">
                    You are solely responsible for your User Content and the consequences of posting it. You represent and warrant that:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>You own or have the necessary rights to use and authorize us to use your User Content</li>
                    <li>Your User Content does not infringe any third-party rights</li>
                    <li>Your User Content complies with these Terms and all applicable laws</li>
                    <li>Your User Content is accurate and not misleading</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">4.3 Content Standards</h3>
                  <p className="mb-4">
                    User Content must not:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Contain any material that is defamatory, obscene, offensive, or hateful</li>
                    <li>Promote violence or discrimination</li>
                    <li>Infringe any intellectual property rights</li>
                    <li>Violate any person's privacy rights</li>
                    <li>Contain viruses, malware, or harmful code</li>
                    <li>Be false, misleading, or fraudulent</li>
                    <li>Violate any applicable laws or regulations</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">4.4 Content Moderation</h3>
                  <p className="mb-4">
                    We reserve the right, but not the obligation, to:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Monitor User Content for violations of these Terms</li>
                    <li>Remove or refuse to display any User Content</li>
                    <li>Suspend or terminate accounts that violate these Terms</li>
                    <li>Disclose User Content to law enforcement authorities</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* 5. Intellectual Property Rights */}
            <section id="intellectual-property" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  5. Intellectual Property Rights
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">5.1 Our Intellectual Property</h3>
                  <p className="mb-4">
                    The Service and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, audio, design, selection, and arrangement) are owned by ScopeDrop, its licensors, or other providers and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.2 Trademarks</h3>
                  <p className="mb-4">
                    ScopeDrop, the ScopeDrop logo, and all related names, logos, product and service names, designs, and slogans are trademarks of ScopeDrop or its affiliates. You may not use such marks without our prior written permission. All other names, logos, product and service names, designs, and slogans are the trademarks of their respective owners.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.3 Copyright Infringement</h3>
                  <p className="mb-4">
                    We respect the intellectual property rights of others. If you believe that any content on the Service infringes your copyright, please provide us with the following information:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>A description of the copyrighted work claimed to be infringed</li>
                    <li>Identification of the allegedly infringing material</li>
                    <li>Your contact information</li>
                    <li>A statement of good faith belief that the use is unauthorized</li>
                    <li>A statement under penalty of perjury that the information is accurate</li>
                    <li>Your physical or electronic signature</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">5.4 DMCA Notice</h3>
                  <p className="mb-4">
                    Notices of claimed copyright infringement should be sent to our designated DMCA agent:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">DMCA Agent</p>
                    <p className="mb-2">ScopeDrop, Inc.</p>
                    <p className="mb-2">Email: dmca@scopedrop.com</p>
                    <p className="mb-2">Address: 123 Tech Street, San Francisco, CA 94105</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* 6. Prohibited Activities */}
            <section id="prohibited" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Ban className="w-6 h-6 mr-2" />
                  6. Prohibited Activities
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    You agree not to engage in any of the following prohibited activities:
                  </p>
                  
                  <h3 className="text-xl font-semibold mt-4 mb-2">6.1 Illegal or Harmful Activities</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Use the Service for any illegal purpose or in violation of any laws</li>
                    <li>Engage in any activity that could harm, disable, overburden, or impair the Service</li>
                    <li>Attempt to gain unauthorized access to any portion of the Service</li>
                    <li>Use the Service to transmit viruses, malware, or other harmful code</li>
                    <li>Engage in any form of harassment, abuse, or harmful behavior toward others</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.2 Interference with Service</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Interfere with or disrupt the Service or servers or networks</li>
                    <li>Bypass any measures we may use to prevent or restrict access</li>
                    <li>Use automated systems or software to extract data (scraping)</li>
                    <li>Attempt to decipher, decompile, or reverse engineer any software</li>
                    <li>Remove, obscure, or alter any legal notices</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.3 Misuse of Service</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Impersonate any person or entity or misrepresent your affiliation</li>
                    <li>Use the Service to send spam or unsolicited communications</li>
                    <li>Collect or store personal information about other users without consent</li>
                    <li>Use the Service for competitive analysis or benchmarking</li>
                    <li>Create false accounts or use the Service under false pretenses</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">6.4 Commercial Activities</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Sell, rent, lease, or commercially exploit the Service</li>
                    <li>Use the Service for unauthorized advertising or promotion</li>
                    <li>Resell or redistribute the Service without our permission</li>
                    <li>Use the Service to compete with us or create a similar service</li>
                  </ul>

                  <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
                    <p className="text-sm">
                      <strong>Warning:</strong> Violation of these prohibited activities may result in immediate termination of your account and legal action.
                    </p>
                  </div>
                </div>
              </Card>
            </section>

            {/* 7. Third-Party Services and Content */}
            <section id="third-party" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">7. Third-Party Services and Content</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">7.1 Third-Party Links</h3>
                  <p className="mb-4">
                    The Service may contain links to third-party websites, services, or resources. We provide these links for your convenience, but we do not endorse and are not responsible for:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>The availability or accuracy of such websites or resources</li>
                    <li>The content, products, or services available from such websites</li>
                    <li>The privacy practices of third-party websites</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.2 Third-Party Integrations</h3>
                  <p className="mb-4">
                    The Service may integrate with third-party services (such as social media platforms, payment processors, or analytics providers). Your use of these integrations is subject to the terms and policies of those third parties. We are not responsible for the actions of any third parties or their compliance with applicable laws.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.3 Third-Party Content</h3>
                  <p className="mb-4">
                    The Service may display content from third parties. We do not control, endorse, or assume responsibility for any third-party content. Your interactions with third-party content providers are solely between you and such providers.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">7.4 App Stores</h3>
                  <p className="mb-4">
                    If you access the Service through a mobile application downloaded from an app store (such as Apple App Store or Google Play Store), you acknowledge that these Terms are between you and ScopeDrop only, and not with the app store provider. The app store provider has no obligation to provide maintenance or support services for the application.
                  </p>
                </div>
              </Card>
            </section>

            {/* 8. Payment Terms */}
            <section id="payment" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">8. Payment Terms</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">8.1 Subscription Plans</h3>
                  <p className="mb-4">
                    Certain features of the Service may require payment. By subscribing to a paid plan, you agree to pay all applicable fees as described in the Service. All fees are in U.S. dollars unless otherwise stated.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.2 Billing and Payment</h3>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Fees are billed in advance on a recurring basis (monthly or annually)</li>
                    <li>You authorize us to charge your payment method on a recurring basis</li>
                    <li>You are responsible for providing accurate and current payment information</li>
                    <li>If payment fails, we may suspend or terminate your access to paid features</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.3 Price Changes</h3>
                  <p className="mb-4">
                    We reserve the right to change our prices at any time. For existing subscribers, price changes will take effect at the start of the next billing cycle after notice is provided. We will provide at least 30 days' notice of any price increases.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.4 Refunds</h3>
                  <p className="mb-4">
                    All fees are non-refundable except as required by law or as explicitly stated in these Terms. We do not provide refunds for partial subscription periods, downgrade refunds, or refunds for unused time.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.5 Free Trials</h3>
                  <p className="mb-4">
                    We may offer free trials for certain paid features. At the end of the free trial, you will be automatically charged unless you cancel before the trial period ends. You may not sign up for multiple free trials.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">8.6 Taxes</h3>
                  <p className="mb-4">
                    You are responsible for all applicable taxes related to your use of the Service, except for taxes based on our net income. If we are required to collect taxes, we will add them to your invoice.
                  </p>
                </div>
              </Card>
            </section>

            {/* 9. Disclaimers and Limitations of Liability */}
            <section id="disclaimers" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <AlertTriangle className="w-6 h-6 mr-2" />
                  9. Disclaimers and Limitations of Liability
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">9.1 Disclaimer of Warranties</h3>
                  <p className="mb-4 uppercase font-bold">
                    THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE</li>
                    <li>WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE</li>
                    <li>WARRANTIES REGARDING THE ACCURACY, RELIABILITY, OR COMPLETENESS OF CONTENT</li>
                    <li>WARRANTIES THAT DEFECTS WILL BE CORRECTED</li>
                    <li>WARRANTIES THAT THE SERVICE IS FREE OF VIRUSES OR HARMFUL COMPONENTS</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.2 Limitation of Liability</h3>
                  <p className="mb-4 uppercase font-bold">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCOPEDROP AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE LIABLE FOR:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                    <li>LOSS OF PROFITS, REVENUE, DATA, OR USE</li>
                    <li>DAMAGES RESULTING FROM YOUR USE OR INABILITY TO USE THE SERVICE</li>
                    <li>DAMAGES RESULTING FROM ANY THIRD-PARTY SERVICES OR CONTENT</li>
                    <li>DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.3 Liability Cap</h3>
                  <p className="mb-4 uppercase font-bold">
                    IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO US IN THE TWELVE MONTHS PRECEDING THE CLAIM OR (B) ONE HUNDRED DOLLARS ($100).
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.4 Exceptions</h3>
                  <p className="mb-4">
                    Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability for incidental or consequential damages. In such jurisdictions, our liability shall be limited to the greatest extent permitted by law.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">9.5 Basis of the Bargain</h3>
                  <p className="mb-4">
                    You acknowledge that we have made the Service available to you in reliance upon the limitations of liability and disclaimers of warranties set forth herein, which form an essential basis of the bargain between us.
                  </p>
                </div>
              </Card>
            </section>

            {/* 10. Indemnification */}
            <section id="indemnification" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">10. Indemnification</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    You agree to indemnify, defend, and hold harmless ScopeDrop, its affiliates, and their respective officers, directors, employees, agents, licensors, and service providers from and against any claims, liabilities, damages, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising from or relating to:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Your use of the Service</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any rights of another party</li>
                    <li>Your User Content</li>
                    <li>Your violation of any applicable laws or regulations</li>
                    <li>Any misrepresentation made by you</li>
                  </ul>
                  
                  <p className="mb-4">
                    We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, in which case you agree to cooperate with us in asserting any available defenses. You shall not settle any claim that affects us without our prior written consent.
                  </p>
                </div>
              </Card>
            </section>

            {/* 11. Termination */}
            <section id="termination" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">11.1 Termination by You</h3>
                  <p className="mb-4">
                    You may terminate your account at any time by:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Following the account deletion process in your account settings</li>
                    <li>Contacting our support team at support@scopedrop.com</li>
                    <li>Canceling any active subscriptions through your payment provider</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">11.2 Termination by Us</h3>
                  <p className="mb-4">
                    We may suspend or terminate your account and access to the Service immediately, without prior notice or liability, for any reason, including but not limited to:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Breach of these Terms</li>
                    <li>Failure to pay applicable fees</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Prolonged inactivity</li>
                    <li>Request by law enforcement or government agencies</li>
                    <li>Unexpected technical or security issues</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">11.3 Effects of Termination</h3>
                  <p className="mb-4">
                    Upon termination:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Your right to use the Service will immediately cease</li>
                    <li>We may delete your account and associated data</li>
                    <li>You remain liable for all fees incurred prior to termination</li>
                    <li>All provisions of these Terms that should survive termination will remain in effect</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">11.4 Data Retention</h3>
                  <p className="mb-4">
                    Following termination, we may retain certain information as required by law or for legitimate business purposes. Any retained information will continue to be subject to our Privacy Policy.
                  </p>
                </div>
              </Card>
            </section>

            {/* 12. Governing Law and Dispute Resolution */}
            <section id="governing-law" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Gavel className="w-6 h-6 mr-2" />
                  12. Governing Law and Dispute Resolution
                </h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">12.1 Governing Law</h3>
                  <p className="mb-4">
                    These Terms and any dispute arising out of or related to them or the Service shall be governed by and construed in accordance with the laws of the State of California, United States, without regard to its conflict of law provisions.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">12.2 Informal Resolution</h3>
                  <p className="mb-4">
                    Before filing a claim, you agree to try to resolve any dispute informally by contacting us at legal@scopedrop.com. We'll try to resolve the dispute informally by contacting you via email. If a dispute is not resolved within 60 days of submission, you or ScopeDrop may bring a formal proceeding.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">12.3 Arbitration Agreement</h3>
                  <p className="mb-4 font-bold uppercase">
                    YOU AND SCOPEDROP AGREE THAT ANY DISPUTE ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL BE RESOLVED SOLELY THROUGH BINDING INDIVIDUAL ARBITRATION, EXCEPT THAT EACH PARTY RETAINS THE RIGHT TO:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Bring an individual action in small claims court</li>
                    <li>Seek injunctive or other equitable relief in court to prevent infringement or misuse of intellectual property rights</li>
                  </ul>

                  <h3 className="text-xl font-semibold mt-4 mb-2">12.4 Arbitration Rules</h3>
                  <p className="mb-4">
                    The arbitration will be conducted by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration will be held in San Francisco County, California, or at another mutually agreed location. The arbitrator's decision will be final and binding.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">12.5 Class Action Waiver</h3>
                  <p className="mb-4 font-bold uppercase">
                    YOU AND SCOPEDROP AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">12.6 Severability</h3>
                  <p className="mb-4">
                    If the arbitration agreement is found to be unenforceable, the unenforceable provision shall be severed, and the remaining arbitration terms shall be enforced.
                  </p>
                </div>
              </Card>
            </section>

            {/* 13. Changes to Terms */}
            <section id="changes" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">13. Changes to Terms</h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    We reserve the right to modify these Terms at any time. When we make changes, we will:
                  </p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Update the "Last Updated" date at the top of these Terms</li>
                    <li>Notify you of material changes via email or through the Service</li>
                    <li>Provide at least 30 days' notice before material changes take effect</li>
                  </ul>
                  
                  <p className="mb-4">
                    Your continued use of the Service after changes become effective constitutes your acceptance of the revised Terms. If you do not agree to the revised Terms, you must stop using the Service.
                  </p>
                  
                  <p className="mb-4">
                    Minor changes, such as clarifications or corrections of typographical errors, may be made without notice and will be effective immediately upon posting.
                  </p>
                </div>
              </Card>
            </section>

            {/* 14. General Provisions */}
            <section id="general" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">14. General Provisions</h2>
                <div className="prose prose-gray max-w-none">
                  <h3 className="text-xl font-semibold mt-4 mb-2">14.1 Entire Agreement</h3>
                  <p className="mb-4">
                    These Terms, together with our Privacy Policy and any other agreements expressly incorporated by reference, constitute the entire agreement between you and ScopeDrop regarding the Service and supersede all prior agreements and understandings.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.2 Waiver</h3>
                  <p className="mb-4">
                    Our failure to enforce any right or provision of these Terms shall not be deemed a waiver of such right or provision. Any waiver must be in writing and signed by an authorized representative.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.3 Severability</h3>
                  <p className="mb-4">
                    If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid provision shall be replaced with a valid provision that comes closest to the intent of the original.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.4 Assignment</h3>
                  <p className="mb-4">
                    You may not assign or transfer these Terms or your rights under them without our prior written consent. We may assign our rights and obligations under these Terms without restriction.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.5 Force Majeure</h3>
                  <p className="mb-4">
                    Neither party shall be liable for any failure or delay in performance due to circumstances beyond its reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, facilities, fuel, energy, labor, or materials.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.6 Relationship of the Parties</h3>
                  <p className="mb-4">
                    Nothing in these Terms creates any agency, partnership, joint venture, or employment relationship between you and ScopeDrop. You have no authority to bind ScopeDrop in any manner.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.7 Export Controls</h3>
                  <p className="mb-4">
                    You agree to comply with all applicable export and import control laws and regulations, including the Export Administration Regulations and sanctions programs administered by the Office of Foreign Assets Control.
                  </p>

                  <h3 className="text-xl font-semibold mt-4 mb-2">14.8 Government Use</h3>
                  <p className="mb-4">
                    If you are a U.S. government entity, the Service is a "commercial item" as defined in 48 C.F.R. §2.101, and your rights are limited to those granted to all other users under these Terms.
                  </p>
                </div>
              </Card>
            </section>

            {/* 15. Contact Information */}
            <section id="contact" className="scroll-mt-20">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Mail className="w-6 h-6 mr-2" />
                  15. Contact Information
                </h2>
                <div className="prose prose-gray max-w-none">
                  <p className="mb-4">
                    If you have any questions, concerns, or feedback regarding these Terms of Service, please contact us:
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="mb-2"><strong>ScopeDrop Legal Department</strong></p>
                    <p className="mb-2">Email: legal@scopedrop.com</p>
                    <p className="mb-2">Address: 123 Tech Street, San Francisco, CA 94105, USA</p>
                    <p className="mb-2">Phone: +1 (555) 123-4567</p>
                  </div>

                  <h3 className="text-xl font-semibold mt-4 mb-2">For Support Issues</h3>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="mb-2">Email: support@scopedrop.com</p>
                    <p className="mb-2">Help Center: https://help.scopedrop.com</p>
                  </div>

                  <h3 className="text-xl font-semibold mt-4 mb-2">For Copyright/DMCA Issues</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="mb-2">Email: dmca@scopedrop.com</p>
                  </div>

                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
                    <p className="text-sm">
                      <strong>Note:</strong> Please include "Terms of Service Inquiry" in the subject line of your email for faster response. We aim to respond to all inquiries within 2-3 business days.
                    </p>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* Acknowledgment Section */}
          <Card className="mt-8 p-6 bg-green-50 border-green-200">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <UserCheck className="w-6 h-6 mr-2" />
              Acknowledgment and Acceptance
            </h2>
            <p className="text-gray-700">
              By using ScopeDrop's services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you are accepting these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms.
            </p>
            <p className="text-sm text-gray-600 mt-4">
              These Terms were last updated on {lastUpdated} and are effective as of {effectiveDate}.
            </p>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default TermsOfService;