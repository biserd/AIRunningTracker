import Footer from "@/components/Footer";
import PublicHeader from "@/components/PublicHeader";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <PublicHeader />

      {/* Terms Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-charcoal mb-8 text-center">
            Terms of <span className="text-strava-orange">Service</span>
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8 text-center">
              Last updated: November 2025
            </p>

            <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-600">
                  By accessing and using RunAnalytics, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">2. Use License</h2>
                <p className="text-gray-600 mb-4">
                  Permission is granted to temporarily access RunAnalytics for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="text-gray-600 space-y-2 ml-6">
                  <li>• Modify or copy the materials</li>
                  <li>• Use the materials for any commercial purpose or for any public display</li>
                  <li>• Attempt to reverse engineer any software contained in RunAnalytics</li>
                  <li>• Remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">3. Data and Privacy</h2>
                <p className="text-gray-600">
                  Your privacy is important to us. We collect and use your running data to provide personalized analytics and insights. We integrate with Strava to access your activity data with your explicit consent. For more details, please review our Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">4. AI Running Coach Service</h2>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-900 mb-2">Important Notice</p>
                  <p className="text-sm text-amber-800">
                    The AI Running Coach is an automated chatbot powered by artificial intelligence. 
                    You are interacting with software, not a human coach or medical professional.
                  </p>
                </div>
                
                <div className="space-y-4 text-gray-600">
                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">Not Professional Advice</h3>
                    <p>
                      The AI Coach provides general running information and suggestions for informational purposes only. 
                      It does not constitute professional coaching, medical advice, health recommendations, or personalized training guidance. 
                      Always consult qualified healthcare professionals and certified running coaches before starting any training program, 
                      especially if you have health concerns, injuries, or medical conditions.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">Accuracy Limitations</h3>
                    <p>
                      While we strive for accuracy, the AI may provide incorrect, incomplete, outdated, or inappropriate information. 
                      AI-generated responses are based on patterns in training data and may not reflect current best practices or 
                      individual circumstances. You should independently verify all suggestions and recommendations before making any 
                      training decisions or changes to your running routine.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">User Responsibility and Assumption of Risk</h3>
                    <p>
                      You assume all risks when following AI-generated advice, suggestions, or training recommendations. 
                      Running and athletic training carry inherent risks of injury. By using the AI Running Coach, you acknowledge that:
                    </p>
                    <ul className="list-disc list-inside space-y-1 mt-2 ml-4">
                      <li>You are solely responsible for your health, safety, and training decisions</li>
                      <li>You will seek professional medical advice before beginning or modifying any exercise program</li>
                      <li>You understand the AI cannot account for your complete medical history or individual limitations</li>
                      <li>You will stop any activity and seek professional help if you experience pain, discomfort, or unusual symptoms</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">Limitation of Liability</h3>
                    <p>
                      RunAnalytics, its owners, employees, and affiliates are not liable for any injuries, health issues, 
                      performance outcomes, or damages of any kind resulting from AI Coach interactions, suggestions, or 
                      training recommendations. This includes but is not limited to direct, indirect, incidental, consequential, 
                      or punitive damages, loss of data, loss of performance results, or any physical injury.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">Conversation Recording and Data Usage</h3>
                    <p>
                      All AI Coach conversations are recorded, stored, and may be analyzed for service improvement, quality assurance, 
                      and AI model training purposes. By using the AI Coach, you consent to this data collection as described in our 
                      Privacy Policy. You can delete your conversation history at any time through your account settings.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-charcoal mb-2">Service Modifications</h3>
                    <p>
                      We reserve the right to modify, suspend, or discontinue the AI Running Coach service at any time without notice. 
                      We may also update AI models, change response behaviors, or modify features without prior notification.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">5. User Accounts</h2>
                <p className="text-gray-600">
                  You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">6. Service Availability</h2>
                <p className="text-gray-600">
                  While we strive to provide continuous service, we do not guarantee that RunAnalytics will be available 100% of the time. The service may be temporarily unavailable for maintenance, updates, or due to technical issues.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">7. Limitation of Liability</h2>
                <p className="text-gray-600">
                  RunAnalytics and its team shall not be held liable for any damages arising from the use or inability to use the service, including but not limited to training advice, performance predictions, or health recommendations provided through any feature of the platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-charcoal mb-4">8. Contact Information</h2>
                <p className="text-gray-600">
                  If you have any questions about these Terms of Service, please contact us through our contact page or email support.
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}