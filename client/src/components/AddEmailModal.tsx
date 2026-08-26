import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

interface AddEmailModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddEmailModal({ open, onClose, onSuccess }: AddEmailModalProps) {
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/add-email", "POST", { email, marketingConsent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Email saved!", description: "You can now subscribe to Premium." });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't save email",
        description: error.message || "Please try a different email address.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-strava-orange/10 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-strava-orange" />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3">
            <Checkbox id="add-email-marketing" checked={marketingConsent} onCheckedChange={(checked) => setMarketingConsent(checked === true)} />
            <Label htmlFor="add-email-marketing" className="cursor-pointer text-sm font-normal leading-5">Email me occasional personalized running insights and Premium updates. Optional. Unsubscribe anytime.</Label>
          </div>
          <DialogTitle className="text-center">Add your email</DialogTitle>
          <DialogDescription className="text-center">
            We need your email to set up your subscription and send you billing receipts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="add-email-input">Email address</Label>
            <Input
              id="add-email-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mutation.mutate()}
            />
          </div>

          <Button
            className="w-full bg-strava-orange hover:bg-strava-orange/90"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !email.trim()}
          >
            {mutation.isPending ? "Saving..." : "Save & Continue"}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Billing and important account messages are sent regardless of this optional preference.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
