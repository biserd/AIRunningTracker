import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
}

export default function EmailCaptureModal({ open }: Props) {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest("POST", "/api/auth/add-email", { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Something went wrong. Please try again.";
      toast({ title: "Couldn't save email", description: msg, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    mutation.mutate(email.trim());
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md [&>button:first-of-type]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center gap-2">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <Mail className="h-6 w-6 text-orange-600" />
          </div>
          <DialogTitle className="text-xl">One last thing — add your email</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            We need your email to send your weekly AI run debrief, important account updates, and coaching insights.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-capture">Email address</Label>
            <Input
              id="email-capture"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={mutation.isPending}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={mutation.isPending || !email.trim()}
          >
            {mutation.isPending ? (
              "Saving…"
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Continue to dashboard
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            We'll never share your email. Unsubscribe anytime.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
