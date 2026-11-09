import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {VerifiedEmailForm} from '@/components/VerifiedEmailForm';
export function AddEmailModal({open,onClose,onSuccess}:{open:boolean;onClose:()=>void;onSuccess:()=>void}) {
  return <Dialog open={open} onOpenChange={value=>{if(!value)onClose();}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle>Verify your email to continue</DialogTitle><DialogDescription>Add an email for account access and subscription receipts. A verification link confirms it belongs to you.</DialogDescription></DialogHeader><VerifiedEmailForm onVerified={onSuccess}/></DialogContent></Dialog>;
}
