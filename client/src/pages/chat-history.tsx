import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MessageCircle, Trash2, Calendar, MessageSquare, Search } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

interface ConversationSummary {
  id: number;
  title: string | null;
  messageCount: number;
  firstMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
}

export default function ChatHistory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: conversations, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ['/api/chat/summaries'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=50`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (conversationId: number) => {
      return await apiRequest(`/api/chat/conversations/${conversationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/summaries'] });
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
    // Navigate to dashboard and open chat with this conversation
    setLocation(`/dashboard?openChat=${conversationId}`);
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

  return (
    <div className="min-h-screen bg-light-grey">
      <SEO
        title="Chat History - RunAnalytics"
        description="View and manage your AI Running Coach conversation history"
      />
      <AppHeader />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-charcoal mb-2">Chat History</h1>
          <p className="text-gray-600">
            View and manage your conversations with the AI Running Coach
          </p>
        </div>

        {/* Search bar */}
        <div className="mb-6">
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

        {/* Conversations list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : !filteredConversations || filteredConversations.length === 0 ? (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-charcoal mb-2">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? "Try a different search term"
                : "Start chatting with your AI Running Coach to see your conversation history here"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setLocation("/dashboard")}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                data-testid="button-start-chatting"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chatting
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all group cursor-pointer"
                onClick={() => handleOpenConversation(conv.id)}
                data-testid={`conversation-card-${conv.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-charcoal group-hover:text-purple-600 transition-colors flex-1 pr-4">
                    {conv.title || conv.firstMessage?.substring(0, 80) || "New Conversation"}
                    {!conv.title && conv.firstMessage && conv.firstMessage.length > 80 && "..."}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="text-gray-400 hover:text-red-600 flex-shrink-0"
                    data-testid={`button-delete-${conv.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {conv.firstMessage && !conv.title && (
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {conv.firstMessage}
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Last activity: {format(new Date(conv.lastMessageAt), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
