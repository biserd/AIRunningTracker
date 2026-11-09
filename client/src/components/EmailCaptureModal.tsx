import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {VerifiedEmailForm} from '@/components/VerifiedEmailForm';
export default function EmailCaptureModal({open,userId}:{open:boolean;userId:number}) {
  return <Dialog open={open}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>Add a verified account email</DialogTitle><DialogDescription>Use your email for account access and billing. Setup and Premium follow-ups are optional.</DialogDescription></DialogHeader><VerifiedEmailForm onVerified={()=>window.location.reload()}/></DialogContent></Dialog>;
}
