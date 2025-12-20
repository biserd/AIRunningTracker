import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Send, Sparkles, TrendingUp, AlertCircle, Activity, PlusCircle, User, ThumbsUp, ThumbsDown, Zap, Target, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  feedback?: "positive" | "negative" | null;
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
  initialConversationId?: number;
  activityContext?: {
    activityId: number;
    activityName?: string;
  };
}

// Typing indicator component with animated dots
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <motion.div
        className="w-2 h-2 bg-purple-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.div
        className="w-2 h-2 bg-purple-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.div
        className="w-2 h-2 bg-purple-400 rounded-full"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  );
}

// Blinking cursor component
function BlinkingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.8, repeat: Infinity }}
    />
  );
}

// Follow-up suggestion chips
function FollowUpSuggestions({ 
  onSuggestionClick, 
  lastMessageContent 
}: { 
  onSuggestionClick: (text: string) => void;
  lastMessageContent?: string;
}) {
  // Generate context-aware suggestions based on last message
  const getSuggestions = () => {
    const content = lastMessageContent?.toLowerCase() || "";
    
    if (content.includes("pace") || content.includes("speed") || content.includes("faster")) {
      return [
        { icon: Zap, text: "How can I improve my speed?", color: "text-yellow-500" },
        { icon: Target, text: "What's a good pace for my next race?", color: "text-blue-500" },
      ];
    }
    if (content.includes("injury") || content.includes("pain") || content.includes("hurt")) {
      return [
        { icon: Heart, text: "How long should I rest?", color: "text-red-500" },
        { icon: Activity, text: "What exercises can help recovery?", color: "text-green-500" },
      ];
    }
    if (content.includes("training") || content.includes("plan") || content.includes("week")) {
      return [
        { icon: TrendingUp, text: "Am I training enough?", color: "text-blue-500" },
        { icon: Target, text: "What should I focus on next?", color: "text-purple-500" },
      ];
    }
    // Default suggestions
    return [
      { icon: TrendingUp, text: "How am I progressing?", color: "text-blue-500" },
      { icon: Target, text: "What's my biggest weakness?", color: "text-orange-500" },
    ];
  };

  const suggestions = getSuggestions();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-2 mt-3"
    >
      {suggestions.map((suggestion, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          onClick={() => onSuggestionClick(suggestion.text)}
          className="text-xs border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950 group"
          data-testid={`button-suggestion-${idx}`}
        >
          <suggestion.icon className={cn("w-3 h-3 mr-1.5", suggestion.color)} />
          <span className="text-slate-600 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
            {suggestion.text}
          </span>
        </Button>
      ))}
    </motion.div>
  );
}

export function ChatPanel({ userId, onClose, initialConversationId, activityContext }: ChatPanelProps) {
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(initialConversationId || null);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/chat/conversations", userId],
    queryFn: () => fetch(`/api/chat/conversations/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
    }).then(res => res.ok ? res.json() : []),
    enabled: !!userId,
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

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, feedback }: { messageId: number; feedback: "positive" | "negative" | null }) => {
      return apiRequest(`/api/chat/messages/${messageId}/feedback`, "PATCH", { feedback });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/chat/${currentConversationId}/messages`] });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Set conversation ID from props
  useEffect(() => {
    if (initialConversationId) {
      setCurrentConversationId(initialConversationId);
    }
  }, [initialConversationId]);

  // Get current conversation details
  const currentConversation = conversations.find(c => c.id === currentConversationId);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setInputMessage("");
    setStreamingMessage("");
  };

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
    setIsWaitingForResponse(true);
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
        body: JSON.stringify({ 
          message,
          context: activityContext ? { activityId: activityContext.activityId } : undefined
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamCompleted = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const jsonStr = line.slice(line.indexOf("data: ") + 6);
              const data = JSON.parse(jsonStr);
              
              if (data.type === "chunk") {
                setIsWaitingForResponse(false);
                setStreamingMessage((prev) => prev + data.content);
              } else if (data.type === "complete") {
                streamCompleted = true;
                queryClient.invalidateQueries({ queryKey: [`/api/chat/${conversationId}/messages`] });
                setStreamingMessage("");
                setIsStreaming(false);
                setIsWaitingForResponse(false);
              } else if (data.type === "error") {
                console.error("Chat error:", data.message);
                setIsStreaming(false);
                setIsWaitingForResponse(false);
                setStreamingMessage("");
              }
            } catch (e) {
              if (line.length > 2) {
                console.warn("SSE parse error:", e, "Line:", line);
              }
            }
          }
        }
      }

      if (!streamCompleted) {
        console.log("Stream ended without complete event, resetting state");
        setStreamingMessage("");
        setIsStreaming(false);
        setIsWaitingForResponse(false);
        queryClient.invalidateQueries({ queryKey: [`/api/chat/${conversationId}/messages`] });
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsStreaming(false);
      setIsWaitingForResponse(false);
      setStreamingMessage("");
    }
  };

  const handleExampleClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleFeedback = (messageId: number, feedback: "positive" | "negative") => {
    const currentMessage = messages.find(m => m.id === messageId);
    // Toggle off if same feedback, otherwise set new feedback
    const newFeedback = currentMessage?.feedback === feedback ? null : feedback;
    feedbackMutation.mutate({ messageId, feedback: newFeedback });
  };

  // Show example prompts if no conversation is active
  const showExamples = !currentConversationId && messages.length === 0 && !isStreaming;

  // Get last assistant message for follow-up suggestions
  const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant");
  const showFollowUpSuggestions = !isStreaming && messages.length > 0 && lastAssistantMessage;

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Running Coach</h2>
                {currentConversation && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentConversation.title || "Conversation"} • {format(new Date(currentConversation.createdAt), 'MMM d')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {currentConversationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                data-testid="button-new-chat"
              >
                <PlusCircle className="w-4 h-4 mr-1" />
                New Chat
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-chat">
                ✕
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {showExamples ? (
            <div className="space-y-4">
              {/* AI Disclaimer */}
              <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-semibold">Welcome! I'm your AI Running Coach</p>
                    <p>
                      I'm an automated assistant powered by AI, not a human coach. I provide general running tips and suggestions, 
                      but I can make mistakes. Please verify important advice with qualified professionals and use at your own risk.
                    </p>
                    <p>
                      Your conversations are recorded to improve our service. By continuing, you agree to our{" "}
                      <a href="/terms" target="_blank" className="underline font-medium">Terms of Service</a>.
                    </p>
                  </div>
                </div>
              </Card>

              <p className="text-sm text-slate-600 dark:text-slate-400">
                Ask me anything about your running performance, training, or goals:
              </p>
              {examplePrompts.map((prompt, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:shadow-md transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"
                    onClick={() => handleExampleClick(prompt.text)}
                    data-testid={`card-example-prompt-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <prompt.icon className={cn("w-5 h-5", prompt.color)} />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{prompt.text}</span>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                      data-testid={`message-${msg.role}-${msg.id}`}
                    >
                      {/* AI Avatar */}
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div className="flex flex-col max-w-[75%]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 transition-all",
                                msg.role === "user"
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-br-md"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-md shadow-sm"
                              )}
                            >
                              {msg.role === "assistant" ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Feedback buttons for assistant messages */}
                        {msg.role === "assistant" && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex items-center gap-1 mt-1 ml-1"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900/30",
                                msg.feedback === "positive" && "bg-green-100 dark:bg-green-900/30 text-green-600"
                              )}
                              onClick={() => handleFeedback(msg.id, "positive")}
                              data-testid={`button-feedback-positive-${msg.id}`}
                            >
                              <ThumbsUp className={cn("w-3 h-3", msg.feedback === "positive" ? "text-green-600" : "text-slate-400")} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/30",
                                msg.feedback === "negative" && "bg-red-100 dark:bg-red-900/30 text-red-600"
                              )}
                              onClick={() => handleFeedback(msg.id, "negative")}
                              data-testid={`button-feedback-negative-${msg.id}`}
                            >
                              <ThumbsDown className={cn("w-3 h-3", msg.feedback === "negative" ? "text-red-600" : "text-slate-400")} />
                            </Button>
                          </motion.div>
                        )}
                      </div>

                      {/* User Avatar */}
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  {isWaitingForResponse && !streamingMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-3 justify-start"
                      data-testid="typing-indicator"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <TypingIndicator />
                      </div>
                    </motion.div>
                  )}

                  {/* Streaming message with blinking cursor */}
                  {streamingMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 justify-start"
                      data-testid="message-streaming"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="max-w-[75%] rounded-2xl rounded-bl-md px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm">
                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingMessage}
                          </ReactMarkdown>
                          <BlinkingCursor />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Follow-up suggestions */}
                  {showFollowUpSuggestions && (
                    <FollowUpSuggestions 
                      onSuggestionClick={handleSendMessage}
                      lastMessageContent={lastAssistantMessage?.content}
                    />
                  )}
                </AnimatePresence>
              )}
              <div ref={messagesEndRef} />
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
              className="flex-1 rounded-full border-slate-300 dark:border-slate-600 focus:border-purple-400 focus:ring-purple-400"
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isStreaming}
              size="icon"
              className="rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
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
    </TooltipProvider>
  );
}
