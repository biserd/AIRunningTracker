import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle, 
  Heart, 
  TrendingUp, 
  Target, 
  MessageSquare,
  Gift,
  Loader2
} from "lucide-react";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  subscriptionPlan: string;
  accountCreatedAt?: Date;
}

const DELETION_REASONS = [
  { value: "too_expensive", label: "Too expensive for my budget" },
  { value: "not_using", label: "I'm not using it enough" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "found_alternative", label: "Found a better alternative" },
  { value: "technical_issues", label: "Technical issues or bugs" },
  { value: "privacy_concerns", label: "Privacy concerns" },
  { value: "other", label: "Other reason" },
];

export function DeleteAccountDialog({ 
  open, 
  onOpenChange, 
  userEmail, 
  subscriptionPlan,
  accountCreatedAt
}: DeleteAccountDialogProps) {
  const [step, setStep] = useState<"feedback" | "retention" | "confirm">("feedback");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const deleteAccountMutation = useMutation({
    mutationFn: async (feedbackData: { reason: string; details?: string }) => {
      return apiRequest("/api/user/delete-with-feedback", "POST", feedbackData);
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted. A confirmation email has been sent.",
      });
      localStorage.removeItem("token");
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep("feedback");
    setSelectedReason("");
    setDetails("");
    onOpenChange(false);
  };

  const handleStayAndDowngrade = () => {
    toast({
      title: "Great choice!",
      description: "Your account has been kept. Consider our Free tier if cost is a concern.",
    });
    handleClose();
  };

  const handleProceedToConfirm = () => {
    setStep("confirm");
  };

  const handleFinalDelete = () => {
    deleteAccountMutation.mutate({
      reason: selectedReason,
      details: details || undefined,
    });
  };

  const accountAgeDays = accountCreatedAt 
    ? Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "feedback" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                Before you go...
              </DialogTitle>
              <DialogDescription>
                We'd love to understand why you're leaving. Your feedback helps us improve.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                {DELETION_REASONS.map((reason) => (
                  <div key={reason.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value={reason.value} id={reason.value} data-testid={`radio-reason-${reason.value}`} />
                    <Label htmlFor={reason.value} className="cursor-pointer flex-1">
                      {reason.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              {selectedReason === "other" && (
                <Textarea
                  placeholder="Please tell us more..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="mt-2"
                  data-testid="input-deletion-details"
                />
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel-deletion">
                Cancel
              </Button>
              <Button
                onClick={() => setStep("retention")}
                disabled={!selectedReason}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-continue-deletion"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "retention" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Heart className="h-5 w-5 text-red-500" />
                We'd hate to see you go!
              </DialogTitle>
              <DialogDescription>
                Here's what you'll lose if you delete your account:
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Your Running History</h4>
                    <p className="text-sm text-gray-600">All synced activities and performance data</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Your Runner Score & Goals</h4>
                    <p className="text-sm text-gray-600">Personal analytics and goal progress</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MessageSquare className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">AI Coach History</h4>
                    <p className="text-sm text-gray-600">All personalized insights and training plans</p>
                  </div>
                </div>
              </div>

              {selectedReason === "too_expensive" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Gift className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-800">Consider our Free Tier</h4>
                      <p className="text-sm text-green-700">
                        Keep your data and access basic features at no cost. You can always upgrade later!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-gray-500">
                You've been with us for <span className="font-semibold text-gray-700">{accountAgeDays} days</span>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("feedback")} data-testid="button-back-feedback">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleStayAndDowngrade}
                className="bg-green-600 hover:bg-green-700"
                data-testid="button-stay"
              >
                I'll Stay!
              </Button>
              <Button
                variant="destructive"
                onClick={handleProceedToConfirm}
                data-testid="button-proceed-delete"
              >
                Delete Anyway
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Final Confirmation
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. Your account and all data will be permanently deleted.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  <strong>You are about to permanently delete:</strong>
                </p>
                <ul className="mt-2 text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Your account ({userEmail})</li>
                  <li>All running activities and analytics</li>
                  <li>AI insights and training plans</li>
                  <li>Goals and progress tracking</li>
                </ul>
                <p className="mt-3 text-sm text-red-800 font-medium">
                  A confirmation email will be sent to {userEmail}.
                </p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("retention")} data-testid="button-back-retention">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleFinalDelete}
                disabled={deleteAccountMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-confirm-delete"
              >
                {deleteAccountMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete My Account
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
