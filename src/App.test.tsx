import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import App from './App'

afterEach(() => {
  cleanup()
})

const getVisualizerPanel = () => {
  const label = screen.getByText(/Flow Visualizer/i)
  const panel = label.closest('section')
  if (!panel) throw new Error('Flow visualizer panel not found')
  return panel
}

const getInspectorPanel = () => {
  const label = screen.getByText(/Token \+ Cookie Snapshot/i)
  const panel = label.closest('section')
  if (!panel) throw new Error('Inspector panel not found')
  return panel
}

describe('flow visualizer controls', () => {
  it('steps timeline forward and updates progress', async () => {
    render(<App />)

    const panel = getVisualizerPanel()

    await waitFor(() => {
      expect(within(panel).getByText(/Step 0 \/ 3/i)).toBeInTheDocument()
    })

    fireEvent.click(within(panel).getByRole('button', { name: 'Step ▶' }))

    expect(within(panel).getByText(/Step 1 \/ 3/i)).toBeInTheDocument()
  })

  it('play and pause toggle timeline runner state', async () => {
    render(<App />)

    const panel = getVisualizerPanel()

    await waitFor(() => {
      expect(within(panel).getByRole('button', { name: /▶ Play/i })).toBeInTheDocument()
    })

    fireEvent.click(within(panel).getByRole('button', { name: /▶ Play/i }))
    expect(within(panel).getByRole('button', { name: /❚❚ Pause/i })).toBeInTheDocument()

    fireEvent.click(within(panel).getByRole('button', { name: /❚❚ Pause/i }))
    expect(within(panel).getByRole('button', { name: /▶ Play/i })).toBeInTheDocument()
  })

  it('injects edge event from dropdown and reflects latest injected event', async () => {
    render(<App />)

    const panel = getVisualizerPanel()
    const select = within(panel).getByLabelText(/Edge-event injection/i)

    fireEvent.change(select, {
      target: { value: 'session-revoked' },
    })

    fireEvent.click(within(panel).getByRole('button', { name: /Inject Event/i }))

    await waitFor(() => {
      expect(within(panel).getByText(/Last injected edge event:/i)).toBeInTheDocument()
    })
  })

  it('reset returns cursor to zero after a step', async () => {
    render(<App />)

    const panel = getVisualizerPanel()

    fireEvent.click(within(panel).getByRole('button', { name: 'Step ▶' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Reset' }))

    expect(within(panel).getByText(/Step 0 \/ 3/i)).toBeInTheDocument()
  })

  it('shows access/refresh tokens and cookie flags in inspector', async () => {
    render(<App />)

    const inspector = getInspectorPanel()

    await waitFor(() => {
      expect(within(inspector).getByLabelText(/access token value/i)).toBeInTheDocument()
      expect(within(inspector).getByLabelText(/refresh token value/i)).toBeInTheDocument()
    })

    expect(within(inspector).getByText(/Cookie Flags \(per step\)/i)).toBeInTheDocument()
    expect(within(inspector).getByText(/SameSite:Lax/i)).toBeInTheDocument()
    expect(within(inspector).getByText(/HttpOnly:yes/i)).toBeInTheDocument()
    expect(within(inspector).getAllByText(/Secure:/i).length).toBeGreaterThan(0)
  })

  it('updates rotation ledger and cookie status after stepping logout cascade scenario', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /Multi-tab logout cascade/i }))

    const panel = getVisualizerPanel()
    const inspector = getInspectorPanel()

    fireEvent.click(within(panel).getByRole('button', { name: 'Step ▶' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Step ▶' }))

    await waitFor(() => {
      expect(within(inspector).getByText(/Refresh success/i)).toBeInTheDocument()
    })

    expect(within(inspector).getByText(/#3/i)).toBeInTheDocument()
    expect(within(inspector).getAllByText(/cleared/i).length).toBeGreaterThan(0)
  })
})
