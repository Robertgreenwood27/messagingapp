"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  // Original state declarations remain the same
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Animation states
  const [phase, setPhase] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Animation effects
  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 0.02) % (Math.PI * 2));
    }, 16);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  // Original handlers remain the same
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation logic...
    if (isSignUp) {
      if (password !== confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (username.length < 3) {
        setError("Username must be at least 3 characters");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (signUpData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: signUpData.user.id,
              username: username,
              full_name: username,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (profileError) throw new Error('Failed to create user profile');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password');
          }
          throw signInError;
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setUsername("");
    setError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative flex min-h-screen items-center justify-center p-4 bg-black/95 text-white/90 overflow-hidden"
    >
      {/* Dynamic background */}
      <div 
        className="absolute inset-0 blur-[100px] opacity-50"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePos.x}% ${mousePos.y}%, 
              rgba(0, 183, 255, 0.15) 0%,
              transparent 40%
            ),
            linear-gradient(
              ${phase * 30}deg,
              rgba(0, 183, 255, 0.1),
              rgba(0, 255, 179, 0.15)
            )
          `
        }}
      />

      {/* Animated particles */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2 + Math.sin((phase + i) * 0.5) * 0.1,
              transform: `scale(${1 + Math.sin((phase + i) * 0.5) * 0.5})`,
              background: `rgba(${Math.sin(phase + i) * 50 + 200}, ${Math.cos(phase + i) * 50 + 200}, 255, 0.5)`,
              boxShadow: `0 0 10px rgba(${Math.sin(phase + i) * 50 + 200}, ${Math.cos(phase + i) * 50 + 200}, 255, 0.5)`,
              transition: 'all 0.5s ease-out'
            }}
          />
        ))}
      </div>

      <Card className="relative w-full max-w-sm overflow-hidden border-0">
        {/* Card background effects */}
        <div 
          className="absolute inset-0 backdrop-blur-xl"
          style={{
            background: `
              radial-gradient(
                circle at ${mousePos.x}% ${mousePos.y}%,
                rgba(0, 255, 255, 0.03) 0%,
                transparent 60%
              ),
              linear-gradient(
                rgba(0, 0, 0, 0.7),
                rgba(0, 0, 0, 0.8)
              )
            `,
            borderImage: `
              linear-gradient(
                ${phase * 45}deg,
                rgba(0, 183, 255, 0.3),
                rgba(0, 255, 179, 0.3)
              ) 1
            `
          }}
        />

        {/* Form content */}
        <div className="relative p-8 space-y-6">
          <div 
            className="space-y-2"
            style={{
              textShadow: '0 0 20px rgba(0, 183, 255, 0.3)'
            }}
          >
            <h1 className="text-2xl font-medium text-white/90">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-white/50">
              {isSignUp 
                ? 'Create an account to start chatting' 
                : 'Sign in to continue to chat'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm text-white/70" htmlFor="username">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  className="bg-black/40 border-white/10 
                           focus:border-cyan-500/20
                           focus:shadow-[0_0_30px_rgba(0,183,255,0.15)]
                           backdrop-blur-sm
                           transition-all duration-300"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/40 border-white/10 
         focus:border-cyan-500/20
         focus:shadow-[0_0_30px_rgba(0,183,255,0.15)]
         backdrop-blur-sm
         transition-all duration-300
         [-webkit-autofill]:bg-cyan-950/40
         [-webkit-autofill]:text-white/90
         [-webkit-autofill]:shadow-[0_0_0_1000px_rgb(8,47,73)_inset]
         [-webkit-autofill]:hover:shadow-[0_0_0_1000px_rgb(8,47,73)_inset]
         [-webkit-autofill]:focus:shadow-[0_0_0_1000px_rgb(8,47,73)_inset]
         [-webkit-autofill]:active:shadow-[0_0_0_1000px_rgb(8,47,73)_inset]"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-black/40 border-white/10 
                           focus:border-cyan-500/20
                           focus:shadow-[0_0_30px_rgba(0,183,255,0.15)]
                           backdrop-blur-sm
                           transition-all duration-300"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 
                           hover:bg-cyan-500/10 
                           transition-all duration-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <label className="text-sm text-white/70" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-black/40 border-white/10 
                             focus:border-cyan-500/20
                             focus:shadow-[0_0_30px_rgba(0,183,255,0.15)]
                             backdrop-blur-sm
                             transition-all duration-300"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 
                             hover:bg-cyan-500/10
                             transition-all duration-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-500/70 bg-red-500/5 rounded-lg border border-red-500/10
                           backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 pt-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-cyan-500/10 border border-cyan-500/20
                         hover:bg-cyan-500/20 hover:border-cyan-500/30
                         hover:shadow-[0_0_30px_rgba(0,183,255,0.25)]
                         disabled:opacity-50
                         backdrop-blur-sm
                         transition-all duration-300"
              >
                {isLoading 
                  ? 'Loading...' 
                  : isSignUp 
                    ? 'Create Account' 
                    : 'Sign In'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  resetForm();
                }}
                className="w-full text-white/50 hover:text-white/90
                         hover:bg-cyan-500/10
                         transition-all duration-300"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don't have an account? Sign up"}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}