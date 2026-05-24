'use client'

import { useState, useRef, useEffect } from 'react'
import { createAuthenticatedFetch } from '@/lib/auth'
import { useChatState } from '@/lib/ChatContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatAssistant() {
  const { isOpen, setIsOpen } = useChatState()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! 👋 I'm here to help you get the most out of your bookkeeping app. Ask me anything about how to use features, manage transactions, create reports, or anything else!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSendMessage() {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const authenticatedFetch = createAuthenticatedFetch()
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble understanding that. Could you rephrase your question?',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Sidebar - Collapsible */}
      {isOpen && (
        <div className="w-64 h-full bg-blue-50 border-l-8 border-blue-400 flex flex-col shadow-2xl overflow-hidden">
          {/* Header with Close Button */}
          <div className="bg-blue-500 text-white px-3 py-2 flex justify-between items-center shrink-0 gap-2">
            <h3 className="font-bold text-base">Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-sm w-8 h-4 rounded flex items-center justify-center transition-all hover:scale-110 font-bold leading-none"
              aria-label="Close chat"
              title="Click to close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-3 py-2 rounded-lg rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-medium text-sm transition"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
