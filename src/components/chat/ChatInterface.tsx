'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { User } from '@supabase/supabase-js';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SuggestedQuestions from './SuggestedQuestions';
import TypingIndicator from './TypingIndicator';
import { useChatMessages } from '@/hooks/useChatMessages';
import { Message } from '@/types/chat';

interface ChatInterfaceProps {
  user: User;
  tripId?: string | null;
}

export default function ChatInterface({ user, tripId }: ChatInterfaceProps) {
  const t = useTranslations('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory
  } = useChatMessages(user.id, tripId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (message: string, context?: any) => {
    if (!message.trim()) return;

    setInputMessage('');
    setIsTyping(true);

    try {
      await sendMessage(message, context);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear the conversation history?')) {
      clearHistory();
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connection Error</h3>
          <p className="text-gray-600 mb-4">Failed to load conversation. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="spinner"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-primary-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('startConversation')}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Ask me anything about travel planning, destinations, hotels, flights, or activities. I'm here to help!
            </p>
            <SuggestedQuestions onQuestionClick={handleSuggestionClick} />
          </div>
        ) : (
          <>
            {/* Clear History Button */}
            <div className="flex justify-center mb-4">
              <button
                onClick={handleClearHistory}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                Clear conversation history
              </button>
            </div>

            {/* Messages */}
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id || index}
                message={message}
                isUser={message.role === 'user'}
                user={user}
              />
            ))}

            {/* Typing Indicator */}
            {isTyping && <TypingIndicator />}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={handleSendMessage}
            disabled={isTyping}
            placeholder={t('askAnything')}
          />
        </div>
      </div>
    </div>
  );
}