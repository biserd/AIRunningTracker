import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Shield, Eye, Lock, Database } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-light-grey">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-charcoal">Privacy Policy</h1>
                <p className="text-gray-600">How we protect and handle your data</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="prose prose-lg max-w-none">
          <div className="mb-8">
            <p className="text-gray-600 text-lg">
              <strong>Last Updated:</strong> September 2025
            </p>
            <p className="text-gray-600">
              At RunAnalytics, we are committed to protecting your privacy and ensuring the security of your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your data when you use our AI-powered running analytics platform.
            </p>
          </div>

          <div className="grid gap-8">
            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Information We Collect</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Email address and name for account creation</li>
                    <li>Password (encrypted and securely stored)</li>
                    <li>Profile preferences and settings</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Strava Data (Third-Party Integration)</h3>
                  <p className="mb-2 text-sm text-gray-600">
                    When you choose to connect your Strava account, we collect the following data through Strava's official API:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Running activities (distance, pace, duration, elevation)</li>
                    <li>Heart rate data (when available)</li>
                    <li>GPS tracking data and routes</li>
                    <li>Basic athlete profile information</li>
                    <li>Activity metadata (timestamps, activity type, descriptions)</li>
                  </ul>
                  <p className="mt-3 text-sm text-gray-600">
                    <strong>Important:</strong> Connecting to Strava is entirely optional. You can use RunAnalytics without a Strava connection, 
                    though some advanced analytics features require activity data.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Usage Data</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>App usage patterns and feature interactions</li>
                    <li>Performance analytics requests and results</li>
                    <li>Training plan preferences and feedback</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-strava-orange/10 rounded-lg flex items-center justify-center">
                  <Activity className="h-4 w-4 text-strava-orange" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Strava Integration & Data Handling</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">Third-Party Integration Notice</p>
                  <p className="text-sm text-amber-700">
                    RunAnalytics integrates with Strava's API to enhance your running analytics. 
                    This integration is governed by both our Privacy Policy and Strava's API Agreement.
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">How Strava Data Is Used</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Personal Analytics Only:</strong> Your Strava data is used exclusively for your personal running analytics and AI insights</li>
                    <li><strong>No Data Sales:</strong> We never sell, license, or monetize your Strava data in any way</li>
                    <li><strong>Privacy Protection:</strong> Only you can see your own Strava data - we never display other users' data, even if it's public on Strava</li>
                    <li><strong>Enhanced Features:</strong> Strava data enables advanced AI coaching, race predictions, and performance trends</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Your Strava Data Rights</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Complete Control:</strong> You can disconnect your Strava account at any time from your settings</li>
                    <li><strong>Data Deletion:</strong> When you disconnect Strava, we delete all your Strava data within 30 days</li>
                    <li><strong>Access Rights:</strong> You can request a copy of all Strava data we have stored for you</li>
                    <li><strong>Strava Access:</strong> You retain full access to your original data on Strava's platform</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Security Measures for Strava Data</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Encrypted Storage:</strong> All Strava data is encrypted both in transit (HTTPS) and at rest</li>
                    <li><strong>Secure Authentication:</strong> We use Strava's official OAuth flow for secure authorization</li>
                    <li><strong>Access Controls:</strong> Strict access controls ensure only authorized systems can process your data</li>
                    <li><strong>Breach Notification:</strong> Any security incidents involving your data will be reported to both you and Strava within 24 hours</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Compliance & Third-Party Terms</h3>
                  <p className="mb-2">Our use of Strava data is governed by:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Strava's API Agreement and Terms of Service</li>
                    <li>Our commitment to data privacy and user rights</li>
                    <li>All applicable data protection laws (GDPR, CCPA, etc.)</li>
                    <li>Industry-standard security practices for third-party integrations</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Eye className="h-4 w-4 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">How We Use Your Information</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Core Features</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Generate AI-powered performance insights and recommendations</li>
                    <li>Create personalized training plans and race predictions</li>
                    <li>Analyze running efficiency and injury risk factors</li>
                    <li>Calculate VO2 Max and other performance metrics</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Service Improvement</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Improve our AI algorithms and recommendation accuracy</li>
                    <li>Develop new features and analytics capabilities</li>
                    <li>Ensure platform security and prevent misuse</li>
                    <li>Provide customer support and technical assistance</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Data Security</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  We implement industry-standard security measures to protect your personal information:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Secure authentication and authorization protocols</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Limited access to personal data on a need-to-know basis</li>
                  <li>Secure cloud infrastructure with reputable providers</li>
                </ul>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Lock className="h-4 w-4 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-charcoal">Data Sharing and Third Parties</h2>
              </div>
              
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold text-charcoal">
                  We do not sell, rent, or trade your personal information to third parties.
                </p>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Limited Sharing</h3>
                  <p>We may share aggregated, anonymized data for:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Research and development of running analytics</li>
                    <li>Industry insights and benchmarking studies</li>
                    <li>Academic research partnerships (with proper anonymization)</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Service Providers</h3>
                  <p>We work with trusted partners for:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Cloud hosting and data storage</li>
                    <li>AI processing and analytics</li>
                    <li>Customer support tools</li>
                    <li>Payment processing (if applicable)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-charcoal mb-4">Your Rights and Choices</h2>
              
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Account Control</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Access and update your account information at any time</li>
                    <li>Control data sharing preferences and privacy settings</li>
                    <li>Disconnect Strava integration when desired</li>
                    <li>Delete your account and associated data</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-charcoal mb-2">Data Requests</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Request a copy of your personal data</li>
                    <li>Request correction of inaccurate information</li>
                    <li>Request deletion of your data (subject to legal requirements)</li>
                    <li>Object to certain data processing activities</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-charcoal mb-4">Contact Information</h2>
              
              <div className="space-y-4 text-gray-700">
                <p>
                  If you have questions about this Privacy Policy or our data practices, please contact us:
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> privacy@runanalytics.com</li>
                    <li><strong>Address:</strong> RunAnalytics Privacy Team</li>
                    <li><strong>Response Time:</strong> We aim to respond within 5 business days</li>
                  </ul>
                </div>
                
                <p className="text-sm">
                  This Privacy Policy may be updated periodically to reflect changes in our practices or legal requirements. 
                  We will notify users of significant changes via email or through the platform.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}