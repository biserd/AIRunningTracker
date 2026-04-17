import type { CapacitorConfig } from '@capacitor/cli';

// RunAnalytics Capacitor configuration (proof of concept).
//
// The `webDir` points at the production Vite build output. To create the
// native iOS/Android projects locally, run:
//
//   npm run build
//   npx cap add ios
//   npx cap add android
//   npx cap sync
//
// See MOBILE.md for the full local setup guide. The Replit environment
// cannot host Xcode/Android Studio, so the platform folders are not
// committed — they are generated on a developer machine.
const config: CapacitorConfig = {
  appId: 'run.aitracker.app',
  appName: 'RunAnalytics',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
