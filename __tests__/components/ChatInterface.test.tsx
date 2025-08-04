import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import ChatInterface from '../../src/components/chat/ChatInterface';
import { useChatMessages } from '../../src/hooks/useChatMessages';
import { User } from '@supabase/supabase-js';

// Mock the hook
jest.mock('../../src/hooks/useChatMessages');
const mockUseChatMessages = useChatMessages as jest.MockedFunction<typeof useChatMessages>;

// Mock next-intl
const messages = {
  chat: {
    askAnything: 'Ask me anything about your trip...',
    startConversation: 'Start planning your perfect trip!',
    suggestedQuestions: [
      'Plan a 5-day trip to Tokyo',
      'Find romantic restaurants in Paris'
    ]
  }
};

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {},
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z'
};

const renderWithIntl = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>
  );
};

describe('ChatInterface', () => {
  const mockSendMessage = jest.fn();
  const mockClearHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseChatMessages.mockReturnValue({
      messages: [],
      loading: false,
      error: null,
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });
  });

  it('should render empty state with suggestions', () => {
    renderWithIntl(<ChatInterface user={mockUser} />);

    expect(screen.getByText('Start planning your perfect trip!')).toBeInTheDocument();
    expect(screen.getByText('Plan a 5-day trip to Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Find romantic restaurants in Paris')).toBeInTheDocument();
  });

  it('should render messages when available', () => {
    const mockMessages = [
      {
        id: '1',
        user_id: 'user-123',
        trip_id: null,
        role: 'user' as const,
        content: 'Hello',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: '2',
        user_id: 'user-123',
        trip_id: null,
        role: 'assistant' as const,
        content: 'Hi there! How can I help you plan your trip?',
        metadata: {},
        created_at: '2024-01-01T00:00:01Z'
      }
    ];

    mockUseChatMessages.mockReturnValue({
      messages: mockMessages,
      loading: false,
      error: null,
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });

    renderWithIntl(<ChatInterface user={mockUser} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there! How can I help you plan your trip?')).toBeInTheDocument();
  });

  it('should handle message input and sending', async () => {
    renderWithIntl(<ChatInterface user={mockUser} />);

    const input = screen.getByPlaceholderText('Ask me anything about your trip...');
    const sendButton = screen.getByTitle('Send message');

    fireEvent.change(input, { target: { value: 'Plan a trip to Tokyo' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Plan a trip to Tokyo', undefined);
    });
  });

  it('should handle suggestion clicks', async () => {
    renderWithIntl(<ChatInterface user={mockUser} />);

    const suggestion = screen.getByText('Plan a 5-day trip to Tokyo');
    fireEvent.click(suggestion);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Plan a 5-day trip to Tokyo');
    });
  });

  it('should show loading state', () => {
    mockUseChatMessages.mockReturnValue({
      messages: [],
      loading: true,
      error: null,
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });

    renderWithIntl(<ChatInterface user={mockUser} />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // spinner
  });

  it('should show error state', () => {
    mockUseChatMessages.mockReturnValue({
      messages: [],
      loading: false,
      error: 'Connection failed',
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });

    renderWithIntl(<ChatInterface user={mockUser} />);

    expect(screen.getByText('Connection Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load conversation. Please try again.')).toBeInTheDocument();
  });

  it('should handle clear history', async () => {
    const mockMessages = [
      {
        id: '1',
        user_id: 'user-123',
        trip_id: null,
        role: 'user' as const,
        content: 'Hello',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    mockUseChatMessages.mockReturnValue({
      messages: mockMessages,
      loading: false,
      error: null,
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });

    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithIntl(<ChatInterface user={mockUser} />);

    const clearButton = screen.getByText('Clear conversation history');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockClearHistory).toHaveBeenCalled();
    });

    mockConfirm.mockRestore();
  });

  it('should not clear history if user cancels', () => {
    const mockMessages = [
      {
        id: '1',
        user_id: 'user-123',
        trip_id: null,
        role: 'user' as const,
        content: 'Hello',
        metadata: {},
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    mockUseChatMessages.mockReturnValue({
      messages: mockMessages,
      loading: false,
      error: null,
      sendMessage: mockSendMessage,
      clearHistory: mockClearHistory,
      refreshMessages: jest.fn()
    });

    // Mock window.confirm to return false
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

    renderWithIntl(<ChatInterface user={mockUser} />);

    const clearButton = screen.getByText('Clear conversation history');
    fireEvent.click(clearButton);

    expect(mockClearHistory).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('should disable input while typing', () => {
    renderWithIntl(<ChatInterface user={mockUser} />);

    const input = screen.getByPlaceholderText('Ask me anything about your trip...');
    const sendButton = screen.getByTitle('Send message');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    // Input should be disabled while sending
    expect(input).toBeDisabled();
  });
});