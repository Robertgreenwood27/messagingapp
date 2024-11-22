// lib/supabase/database.types.ts

export type ReadReceipt = {
  id: string
  user_id: string
  message_id: string
  read_at: string
  created_at: string
}

export type Message = {
  id: string
  created_at: string
  content: string
  sender_id: string
  conversation_id: string
  status?: 'sending' | 'failed'
  tempId?: string
  sender?: Profile
  read_receipts?: ReadReceipt[]
}

export type Conversation = {
  id: string
  created_at: string
  updated_at: string
  participant1_id: string
  participant2_id: string
}

export type Profile = {
  id: string
  created_at: string
  username: string
  full_name: string
  avatar_url: string
  updated_at: string
}

export type TypingStatus = {
  id: string
  user_id: string
  conversation_id: string
  is_typing: boolean
  updated_at: string
}

export type OnlineStatus = {
  id: string
  user_id: string
  last_seen: string
  is_online: boolean
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at' | 'sender' | 'read_receipts'>
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'sender' | 'read_receipts'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      typing_status: {
        Row: TypingStatus
        Insert: Omit<TypingStatus, 'id' | 'updated_at'>
        Update: Partial<Omit<TypingStatus, 'id'>>
      }
      online_status: {
        Row: OnlineStatus
        Insert: Omit<OnlineStatus, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<OnlineStatus, 'id' | 'created_at'>>
      }
      read_receipts: {
        Row: ReadReceipt
        Insert: Omit<ReadReceipt, 'id' | 'created_at'>
        Update: Partial<Omit<ReadReceipt, 'id' | 'created_at'>>
      }
    }
  }
}