'use client'

import { createContext, useContext, useState } from 'react'

interface ChatContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatState() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatState must be used within ChatProvider')
  }
  return context
}
