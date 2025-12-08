import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, MessageSquare, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import PublicHeader from "@/components/PublicHeader";
import Footer from "@/components/Footer";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = (data: ContactData) => {
    // Simulate form submission
    console.log("Contact form submission:", data);
    setSubmitted(true);
    toast({
      title: "Message sent!",
      description: "We'll get back to you within 24 hours.",
    });
    form.reset();
  };

  return (
    <div className="min-h-screen bg-light-grey">
      <PublicHeader />

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-strava-orange" />
                  <span>Send us a message</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="text-center space-y-4 py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Send className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-charcoal">Message Sent!</h3>
                    <p className="text-gray-600">
                      Thank you for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <Button
                      onClick={() => setSubmitted(false)}
                      variant="outline"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          {...form.register("name")}
                          placeholder="Your name"
                        />
                        {form.formState.errors.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...form.register("email")}
                          placeholder="your@email.com"
                        />
                        {form.formState.errors.email && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        {...form.register("subject")}
                        placeholder="What can we help you with?"
                      />
                      {form.formState.errors.subject && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        {...form.register("message")}
                        placeholder="Tell us more about your question or feedback..."
                        rows={6}
                      />
                      {form.formState.errors.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.message.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-strava-orange hover:bg-strava-orange/90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-charcoal mb-6">Get in Touch</h2>
              <p className="text-gray-600 mb-8">
                Have questions about RunAnalytics? Want to provide feedback or report an issue? 
                We'd love to hear from you. Our team is here to help you get the most out of your running analytics.
              </p>
            </div>

            {/* Email Contact */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Email Support</h3>
                  <p className="text-gray-600 mb-2">
                    For general inquiries and support
                  </p>
                  <a href="mailto:hello@aitracker.run" className="text-strava-orange hover:underline font-medium">
                    hello@aitracker.run
                  </a>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal mb-1">Have Questions?</h3>
                  <p className="text-gray-600 mb-3">
                    Check out our comprehensive FAQ page for quick answers to common questions.
                  </p>
                  <Link href="/faq">
                    <a className="inline-flex items-center text-strava-orange hover:underline font-medium">
                      Visit FAQ Page →
                    </a>
                  </Link>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-gradient-to-r from-strava-orange to-orange-600 rounded-lg p-6 text-white">
              <h3 className="font-semibold mb-2">Quick Response Guarantee</h3>
              <p className="text-sm opacity-90">
                We aim to respond to all inquiries within 24 hours during business days. 
                For urgent technical issues, we typically respond within 4 hours.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}