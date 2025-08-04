'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types/chat';

export function useChatMessages(userId: string, tripId?: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load message history
  const loadMessages = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .eq('trip_id', tripId || null)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchError) {
        throw fetchError;
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Failed to load conversation history');
    } finally {
      setLoading(false);
    }
  }, [userId, tripId]);

  // Send a new message
  const sendMessage = useCallback(async (content: string, context?: any) => {
    if (!userId || !content.trim()) return;

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        trip_id: tripId || null,
        role: 'user',
        content: content.trim(),
        metadata: context || {},
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);

      // Send to API
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: content.trim(),
          tripId: tripId || undefined,
          context: context || {}
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();

      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== userMessage.id);
        const newMessages = [];
        
        if (result.userMessage) {
          newMessages.push(result.userMessage);
        }
        
        if (result.assistantMessage) {
          newMessages.push(result.assistantMessage);
        }
        
        return [...filtered, ...newMessages];
      });

    } catch (err) {
      console.error('Error sending message:', err);
      
      // Remove the temporary message and show error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        user_id: userId,
        trip_id: tripId || null,
        role: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again.',
        metadata: { error: true },
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      throw err;
    }
  }, [userId, tripId]);

  // Clear conversation history
  const clearHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/chat/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          tripId: tripId || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      setMessages([]);
    } catch (err) {
      console.error('Error clearing history:', err);
      setError('Failed to clear conversation history');
    }
  }, [userId, tripId]);

  // Load messages on mount and when dependencies change
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`messages-${userId}-${tripId || 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `user_id=eq.${userId}${tripId ? ` AND trip_id=eq.${tripId}` : ' AND trip_id=is.null'}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, tripId]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory,
    refreshMessages: loadMessages
  };
}