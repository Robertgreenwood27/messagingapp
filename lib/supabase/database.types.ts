// lib/supabase/database.types.ts
export type Message = {
    id: string
    created_at: string
    content: string
    sender_id: string
    conversation_id: string
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
  
  export type Database = {
    public: {
      Tables: {
        messages: {
          Row: Message
          Insert: Omit<Message, 'id' | 'created_at'>
          Update: Partial<Omit<Message, 'id' | 'created_at'>>
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
      }
    }
  }