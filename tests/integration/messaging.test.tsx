// tests/integration/messaging.test.tsx
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test-utils'
import userEvent from '@testing-library/user-event'
import { MessagesProvider } from '@/components/providers/messages-provider'

// Test component
const TestComponent = () => {
  return (
    <div>
      <ul data-testid="message-list">
        <li data-testid="message-msg1">Test message 1</li>
      </ul>
      <button data-testid="send-button">Send Message</button>
    </div>
  )
}

describe('Messaging Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads initial messages', async () => {
    render(
      <MessagesProvider conversationId="test-conv-id">
        <TestComponent />
      </MessagesProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Test message 1')).toBeInTheDocument()
    })
  })
})