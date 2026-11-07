import AppHeader from '@/components/AppHeader';
import {GarminRecoveryDashboard} from '@/components/GarminRecoveryDashboard';
import {Helmet} from 'react-helmet';
export default function RecoveryPage(){return <div className="min-h-screen bg-slate-50 pb-12"><Helmet><title>Recovery | RunAnalytics</title><meta name="robots" content="noindex,nofollow"/></Helmet><AppHeader/><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"><GarminRecoveryDashboard/></main></div>;}
