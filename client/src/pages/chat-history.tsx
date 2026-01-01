import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, Trash2, Calendar, MessageSquare, Search, ArrowLeft, Sparkles, User } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ConversationSummary {
  id: number;
  title: string | null;
  messageCount: number;
  firstMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatHistory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ['/api/chat/summaries?limit=50'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['/api/chat', selectedConversationId, 'messages'],
    queryFn: async () => {
      return await apiRequest(`/api/chat/${selectedConversationId}/messages`);
    },
    enabled: !!selectedConversationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return await apiRequest(`/api/chat/conversations/${conversationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/summaries'] });
      setSelectedConversationId(null);
      toast({
        title: "Success",
        description: "Conversation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete conversation",
      });
    },
  });

  const handleOpenConversation = (conversationId: number) => {
    setSelectedConversationId(conversationId);
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: number) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
      deleteMutation.mutate(conversationId);
    }
  };

  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(search) ||
      conv.firstMessage?.toLowerCase().includes(search)
    );
  });

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  return (
    <div className="min-h-screen bg-light-grey">
      <SEO
        title="Chat History - RunAnalytics"
        description="View and manage your AI Running Coach conversation history"
      />
      <AppHeader />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Chat History</h1>
          <p className="text-gray-600">
            View and manage your conversations with the AI Running Coach
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversations list */}
          <div className={cn(
            "lg:col-span-1",
            selectedConversationId && "hidden lg:block"
          )}>
            {/* Search bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse">
                      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : !filteredConversations || filteredConversations.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal mb-2">
                    {searchQuery ? "No conversations found" : "No conversations yet"}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {searchQuery
                      ? "Try a different search term"
                      : "Start chatting with your AI Running Coach"}
                  </p>
                  {!searchQuery && (
                    <Button
                      onClick={() => setLocation("/dashboard")}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                      data-testid="button-start-chatting"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Start Chatting
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "bg-white rounded-lg p-4 shadow-sm border transition-all cursor-pointer",
                        selectedConversationId === conv.id
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-purple-300 hover:shadow-md"
                      )}
                      onClick={() => handleOpenConversation(conv.id)}
                      data-testid={`conversation-card-${conv.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-semibold text-charcoal flex-1 pr-2 line-clamp-2">
                          {conv.title || conv.firstMessage?.substring(0, 60) || "New Conversation"}
                          {!conv.title && conv.firstMessage && conv.firstMessage.length > 60 && "..."}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteConversation(e, conv.id)}
                          className="text-gray-400 hover:text-red-600 flex-shrink-0 h-6 w-6 p-0"
                          data-testid={`button-delete-${conv.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {conv.messageCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(conv.lastMessageAt), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Messages panel */}
          <div className={cn(
            "lg:col-span-2",
            !selectedConversationId && "hidden lg:block"
          )}>
            {selectedConversationId ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-280px)] flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedConversationId(null)}
                    className="lg:hidden"
                    data-testid="button-back-to-list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-charcoal truncate">
                      {selectedConversation?.title || "Conversation"}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {selectedConversation && format(new Date(selectedConversation.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex gap-3",
                            msg.role === "user" ? "justify-end" : "justify-start"
                          )}
                          data-testid={`message-${msg.role}-${msg.id}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                          )}
                          
                          <div className="flex flex-col max-w-[75%]">
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5",
                                msg.role === "user"
                                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-br-md"
                                  : "bg-slate-100 text-slate-900 rounded-bl-md shadow-sm"
                              )}
                            >
                              {msg.role === "assistant" ? (
                                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 mt-1 px-1">
                              {format(new Date(msg.createdAt), 'h:mm a')}
                            </span>
                          </div>

                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No messages in this conversation
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-280px)] flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-charcoal mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Click on a conversation from the list to view the messages
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
