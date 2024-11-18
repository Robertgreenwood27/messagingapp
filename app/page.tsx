// app/page.tsx
'use client'

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        flowType: 'pkce',  // This enables the PKCE flow which is more secure
      }
    })

    if (error) {
      console.error('Error:', error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <h1 className="text-2xl font-bold text-center">Welcome to MessagingApp</h1>
        <p className="text-center text-muted-foreground">
          Sign in to start chatting
        </p>
        <Button 
          className="w-full" 
          onClick={handleLogin}
        >
          Continue with GitHub
        </Button>
      </Card>
    </div>
  )
}