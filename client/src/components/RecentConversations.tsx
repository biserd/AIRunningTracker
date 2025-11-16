import { useQuery } from "@tanstack/react-query";
import { MessageCircle, ArrowRight, Calendar, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ConversationSummary {
  id: number;
  title: string | null;
  messageCount: number;
  firstMessage: string | null;
  lastMessageAt: string;
  createdAt: string;
}

interface RecentConversationsProps {
  onOpenConversation: (conversationId: number) => void;
}

export default function RecentConversations({ onOpenConversation }: RecentConversationsProps) {
  const { data: conversations, isLoading } = useQuery<ConversationSummary[]>({
    queryKey: ['/api/chat/summaries'],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(`${queryKey[0]}?limit=3`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json();
    },
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal dark:text-white flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-600" />
            Recent Conversations
          </h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 shadow-sm border border-purple-100 dark:border-slate-600">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-charcoal dark:text-white mb-2">
            Start Your First Conversation
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
            Ask the AI Coach anything about your training, performance, or running goals.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-charcoal dark:text-white flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-purple-600" />
          Recent Conversations
        </h3>
        <Link href="/chat-history">
          <Button
            variant="ghost"
            size="sm"
            className="text-purple-600 hover:text-purple-700 dark:text-purple-400"
            data-testid="button-view-all-conversations"
          >
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onOpenConversation(conv.id)}
            className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-slate-700/50 transition-all group"
            data-testid={`conversation-${conv.id}`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-charcoal dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 line-clamp-1">
                {conv.title || conv.firstMessage?.substring(0, 50) || "New Conversation"}
                {!conv.title && conv.firstMessage && conv.firstMessage.length > 50 && "..."}
              </h4>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                {format(new Date(conv.lastMessageAt), 'MMM d')}
              </span>
            </div>
            
            {conv.firstMessage && !conv.title && (
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                {conv.firstMessage}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {conv.messageCount} {conv.messageCount === 1 ? 'message' : 'messages'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(conv.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
