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

// Types for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null
  onresult: ((this: ISpeechRecognition, ev: SpeechRecognitionEvent) => any) | null
  onerror: ((this: ISpeechRecognition, ev: Event & { error: string }) => any) | null
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null
}

export default function ChatAssistant() {
  const { isOpen, setIsOpen } = useChatState()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm here to help you get the most out of your bookkeeping app. Ask me anything about how to use features, manage transactions, create reports, or anything else!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const syntheisRef = useRef<SpeechSynthesisUtterance | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        console.warn('Speech Recognition not supported in this browser')
        return
      }

      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current!.continuous = false
      recognitionRef.current!.interimResults = true
      recognitionRef.current!.lang = 'en-US'

      recognitionRef.current!.onstart = () => {
        console.log('Speech recognition started')
      }

      recognitionRef.current!.onresult = (event: any) => {
        let transcript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            transcript += transcriptSegment + ' '
          } else {
            interimTranscript += transcriptSegment
          }
        }

        if (transcript) {
          setInput(prev => (prev + transcript).trim())
        }
      }

      recognitionRef.current!.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current!.onend = () => {
        console.log('Speech recognition ended')
        setIsListening(false)
      }
    } catch (error) {
      console.error('Failed to initialize speech recognition:', error)
    }
  }, [])

  function toggleVoiceInput() {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.')
      return
    }

    try {
      if (isListening) {
        recognitionRef.current!.stop()
        setIsListening(false)
      } else {
        recognitionRef.current!.abort()
        recognitionRef.current!.start()
        setIsListening(true)
      }
    } catch (error) {
      console.error('Error toggling voice input:', error)
      setIsListening(false)
    }
  }

  function speakMessage(text: string) {
    if (!voiceEnabled || typeof window === 'undefined') return

    // Cancel any ongoing speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.85
    utterance.pitch = 1.6
    utterance.volume = 1.0

    // Add event listeners FIRST (before any voice selection)
    utterance.onstart = () => console.log('[VOICE EVENT] Start - using voice:', utterance.voice?.name)
    utterance.onend = () => console.log('[VOICE EVENT] End')
    utterance.onerror = (e: any) => console.log('[VOICE ERROR]', e.error)

    console.log('[VOICE] Speaking with pitch 1.6, rate 0.85')

    // Get available voices
    let voices = window.speechSynthesis.getVoices()

    // If no voices loaded, try again after a brief delay
    if (voices.length === 0) {
      console.log('[VOICE] No voices loaded yet, waiting...')
      setTimeout(() => {
        const freshVoices = window.speechSynthesis.getVoices()
        console.log('[VOICE] Voices loaded, count:', freshVoices.length)
        selectAndApplyVoice(utterance, freshVoices)
        syntheisRef.current = utterance
        console.log('[VOICE] Calling speak() with voice (async):', utterance.voice?.name)
        window.speechSynthesis.speak(utterance)
      }, 100)
      return
    }

    selectAndApplyVoice(utterance, voices)

    syntheisRef.current = utterance
    console.log('[VOICE] Calling speak() with voice:', utterance.voice?.name)
    window.speechSynthesis.speak(utterance)
  }

  function selectAndApplyVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) {
    const allVoiceNames = voices.map(v => v.name)
    console.log('[VOICE] ALL AVAILABLE VOICES:', allVoiceNames)

    if (voices.length > 0) {
      let selectedVoice = null

      // PRIORITY 1: FORCE Zira (American female voice)
      selectedVoice = voices.find(v => v.name === 'Microsoft Zira - English (United States)')
      if (selectedVoice) {
        console.log('[VOICE] ✓✓✓ FORCING MICROSOFT ZIRA - AMERICAN FEMALE VOICE')
      }

      // PRIORITY 2: Try other known female voices
      if (!selectedVoice) {
        const knownFemaleVoices = [
          'Microsoft Aria',
          'Microsoft Jenny',
          'Zira',
          'Aria',
          'Jenny',
        ]

        for (const voiceName of knownFemaleVoices) {
          selectedVoice = voices.find(v => v.name.includes(voiceName))
          if (selectedVoice) {
            console.log('[VOICE] ✓ Using female voice:', selectedVoice.name)
            break
          }
        }
      }

      // PRIORITY 3: Search by keywords
      if (!selectedVoice) {
        selectedVoice = voices.find(v =>
          v.name.toLowerCase().includes('female')
        )
        if (selectedVoice) {
          console.log('[VOICE] ✓ Using voice with "female":', selectedVoice.name)
        }
      }

      // PRIORITY 4: Last resort (but avoid obviously male voices)
      if (!selectedVoice) {
        selectedVoice = voices.find(v =>
          !v.name.toLowerCase().includes('male') &&
          !v.name.toLowerCase().includes('david') &&
          !v.name.toLowerCase().includes('mark')
        )
        if (selectedVoice) {
          console.log('[VOICE] Fallback voice:', selectedVoice.name)
        }
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice
        console.log('[VOICE] ★★★ FINAL VOICE:', selectedVoice.name, 'Lang:', selectedVoice.lang)
        console.log('[VOICE] Pitch:', utterance.pitch, 'Rate:', utterance.rate, 'Volume:', utterance.volume)
      }
    }
  }

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
      // DEBUG: Check token before making request
      const debugToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      console.log('[CHAT] Token check:', {
        tokenExists: !!debugToken,
        tokenLength: debugToken?.length || 0,
        tokenPreview: debugToken ? `${debugToken.substring(0, 20)}...` : 'null',
      })

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

      console.log('[CHAT] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[CHAT] API error:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorData,
        })
        throw new Error(`API error ${response.status}: ${errorData.error || errorData.reply || 'Unknown error'}`)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Speak the response if voice is enabled
      if (voiceEnabled) {
        speakMessage(data.reply)
      }
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
      {/* Chat Widget - Bottom Right Corner (Fixed Position) */}
      {isOpen && (
        <div className="bg-white flex flex-col shadow-2xl overflow-hidden rounded-lg border border-gray-200"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '384px',
            height: '500px',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            animation: 'slideUp 0.3s ease-out'
          }}>
          {/* Header with Close Button */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex justify-between items-center shrink-0 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg">
                💬
              </div>
              <div>
                <h3 className="font-bold text-sm">Bookkeeping Assistant</h3>
                <p className="text-xs text-blue-100">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-shrink-0 text-white hover:bg-blue-800 text-xl w-8 h-8 rounded flex items-center justify-center transition-all hover:scale-110 font-bold"
              aria-label="Close chat"
              title="Click to close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 rounded-bl-none border border-gray-200'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span className={`text-xs opacity-60 mt-1 block ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 px-4 py-2 rounded-lg rounded-bl-none border border-gray-200">
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
          <div className="border-t border-gray-200 p-3 bg-white">
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
                title="Send message"
              >
                ➤
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Powered by AI • Your data is private</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
