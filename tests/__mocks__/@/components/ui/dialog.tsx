// tests/__mocks__/@/components/ui/dialog.tsx
import React from 'react'

export function Dialog({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DialogContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

// tests/__mocks__/@/components/ui/button.tsx
export function Button(props: any) {
  return <button {...props} />
}

// tests/__mocks__/@/components/ui/input.tsx
export function Input(props: any) {
  return <input {...props} />
}