import { Activity } from "lucide-react";
import { Link } from "wouter";
import { VERSION } from "@shared/version";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={16} />
              </div>
              <h3 className="text-xl font-bold">RunAnalytics</h3>
            </div>
            <p className="text-gray-400 mb-4">
              AI-powered running analytics platform that helps athletes optimize their performance and achieve their goals.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/features" className="hover:text-white transition-colors" data-testid="link-features">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors" data-testid="link-pricing">Pricing</Link></li>
              <li><Link href="/features#ai-insights" className="hover:text-white transition-colors">AI Insights</Link></li>
              <li><Link href="/features#training-plans" className="hover:text-white transition-colors">Training Plans</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/about" className="hover:text-white transition-colors" data-testid="link-about">About</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors" data-testid="link-faq">FAQ</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors" data-testid="link-terms">Terms of Service</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
            <p>&copy; 2024 RunAnalytics. All rights reserved.</p>
            <div className="flex items-center space-x-4">
              <span className="text-sm" data-testid="text-version">v{VERSION}</span>
              <Link href="/release-notes" className="text-sm hover:text-white transition-colors" data-testid="link-release-notes">
                Release Notes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}