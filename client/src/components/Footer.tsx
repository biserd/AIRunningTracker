import { Activity } from "lucide-react";
import { Link } from "wouter";
import { VERSION } from "@shared/version";
import { StravaPoweredBy } from "@/components/StravaConnect";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-strava-orange rounded-lg flex items-center justify-center">
                <Activity className="text-white" size={16} />
              </div>
              <h3 className="text-xl font-bold">RunAnalytics</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Turning your raw running data into your next Personal Record. Stop guessing how to train and start running with confidence.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/features" className="hover:text-white transition-colors" data-testid="link-features">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors" data-testid="link-pricing">Pricing</Link></li>
              <li><Link href="/tools" className="hover:text-white transition-colors" data-testid="link-tools">Tools</Link></li>
              <li><Link href="/ai-running-coach" className="hover:text-white transition-colors" data-testid="link-ai-coach">AI Running Coach</Link></li>
              <li><Link href="/ai-agent-coach" className="hover:text-white transition-colors" data-testid="link-ai-agent-coach">AI Agent Coach</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors" data-testid="link-blog">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Tools</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/tools/race-predictor" className="hover:text-white transition-colors" data-testid="link-tool-race-predictor">Race Predictor</Link></li>
              <li><Link href="/tools/aerobic-decoupling-calculator" className="hover:text-white transition-colors" data-testid="link-tool-aerobic">Aerobic Decoupling</Link></li>
              <li><Link href="/tools/training-split-analyzer" className="hover:text-white transition-colors" data-testid="link-tool-training-split">Training Split Analyzer</Link></li>
              <li><Link href="/tools/marathon-fueling" className="hover:text-white transition-colors" data-testid="link-tool-fueling">Marathon Fueling</Link></li>
              <li><Link href="/tools/cadence-analyzer" className="hover:text-white transition-colors" data-testid="link-tool-cadence">Form Stability</Link></li>
              <li><Link href="/tools/shoes" className="hover:text-white transition-colors" data-testid="link-tool-shoes">Running Shoe Hub</Link></li>
              <li><Link href="/tools/shoe-finder" className="hover:text-white transition-colors" data-testid="link-tool-shoe-finder">Shoe Finder</Link></li>
              <li><Link href="/tools/shoes/compare" className="hover:text-white transition-colors" data-testid="link-tool-shoe-comparisons">Shoe Comparisons</Link></li>
              <li><Link href="/tools/rotation-planner" className="hover:text-white transition-colors" data-testid="link-tool-rotation">Rotation Planner</Link></li>
              <li><Link href="/tools/heatmap" className="hover:text-white transition-colors" data-testid="link-tool-heatmap">Running Heatmap</Link></li>
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
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="flex flex-col items-center sm:items-start space-y-2">
              <p>&copy; 2025 RunAnalytics. All rights reserved.</p>
              <StravaPoweredBy variant="white" size="sm" />
            </div>
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