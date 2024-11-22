// tests/__mocks__/@/components/ui/index.tsx
import React from 'react'

export const Dialog = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const DialogTrigger = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const DialogContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const DialogHeader = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const DialogTitle = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const Button = (props: any) => <button {...props} />
export const Input = (props: any) => <input {...props} />
export const Card = ({ children }: { children: React.ReactNode }) => <div>{children}</div>
export const ScrollArea = ({ children }: { children: React.ReactNode }) => <div>{children}</div>