import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Sparkles, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatPanelProps {
  userId: number;
  onClose?: () => void;
}

export function ChatPanel({ userId, onClose }: ChatPanelProps) {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/chat/conversations", userId],
  });

  // Fetch messages for current conversation
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/chat/${currentConversationId}/messages`],
    enabled: !!currentConversationId,
  });

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("/api/chat/conversations", "POST", { title });
    },
    onSuccess: (newConversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversations", userId] });
      setCurrentConversationId(newConversation.id);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Example prompts
  const examplePrompts = [
    { icon: TrendingUp, text: "Why am I running slower lately?", color: "text-blue-500" },
    { icon: Sparkles, text: "Am I improving over time?", color: "text-purple-500" },
    { icon: AlertCircle, text: "What's my injury risk?", color: "text-orange-500" },
    { icon: Activity, text: "How should I train this week?", color: "text-green-500" },
  ];

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isStreaming) return;

    // Create conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      const newConversation = await createConversationMutation.mutateAsync(message.slice(0, 50));
      conversationId = newConversation.id;
    }

    setInputMessage("");
    setIsStreaming(true);
    setStreamingMessage("");

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/chat/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ message }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamCompleted = false;
      let buffer = ""; // Buffer for incomplete lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete lines from buffer
        const lines = buffer.split("\n");
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const jsonStr = line.slice(line.indexOf("data: ") + 6);
              const data = JSON.parse(jsonStr);
              
              if (data.type === "chunk") {
                setStreamingMessage((prev) => prev + data.content);
              } else if (data.type === "complete") {
                streamCompleted = true;
                // Refresh messages
                queryClient.invalidateQueries({ queryKey: [`/api/chat/${conversationId}/messages`] });
                setStreamingMessage("");
                setIsStreaming(false);
              } else if (data.type === "error") {
                console.error("Chat error:", data.message);
                setIsStreaming(false);
                setStreamingMessage("");
              }
            } catch (e) {
              // Only log actual parse errors, ignore keep-alive
              if (line.length > 2) {
                console.warn("SSE parse error:", e, "Line:", line);
              }
            }
          }
        }
      }

      // Ensure state is reset even if complete event wasn't received
      if (!streamCompleted) {
        console.log("Stream ended without complete event, resetting state");
        setStreamingMessage("");
        setIsStreaming(false);
        // Refresh messages anyway
        queryClient.invalidateQueries({ queryKey: [`/api/chat/${conversationId}/messages`] });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsStreaming(false);
      setStreamingMessage("");
    }
  };

  const handleExampleClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Show example prompts if no conversation is active
  const showExamples = !currentConversationId && messages.length === 0 && !isStreaming;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Running Coach</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-chat">
            ✕
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {showExamples ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Ask me anything about your running performance, training, or goals:
            </p>
            {examplePrompts.map((prompt, index) => (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                onClick={() => handleExampleClick(prompt.text)}
                data-testid={`card-example-prompt-${index}`}
              >
                <div className="flex items-center gap-3">
                  <prompt.icon className={cn("w-5 h-5", prompt.color)} />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{prompt.text}</span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                    data-testid={`message-${msg.role}-${msg.id}`}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        msg.role === "user"
                          ? "bg-purple-500 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {streamingMessage && (
                  <div className="flex justify-start" data-testid="message-streaming">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                      <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500 mt-2" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputMessage);
          }}
          className="flex gap-2"
        >
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about your running..."
            disabled={isStreaming}
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim() || isStreaming}
            size="icon"
            data-testid="button-send-message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
