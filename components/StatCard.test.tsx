import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from './StatCard'

const MockIcon = () => <svg data-testid="mock-icon" />

describe('StatCard', () => {
  it('renders title, value, and subtitle', () => {
    render(
      <StatCard
        title="Total Products"
        value="150"
        subtitle="Last 30 days"
        icon={MockIcon}
      />
    )
    expect(screen.getByText('Total Products')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('renders with the default blue accent', () => {
    render(
      <StatCard
        title="Revenue"
        value="$5,000"
        subtitle="This month"
        icon={MockIcon}
      />
    )
    const card = screen.getByText('Revenue').closest('.glass-card')
    expect(card).toBeInTheDocument()
  })

  it('applies the alert style when alert is true', () => {
    render(
      <StatCard
        title="Low Stock Items"
        value="5"
        subtitle="Needs attention"
        icon={MockIcon}
        alert
      />
    )
    expect(screen.getByText('Low Stock Items')).toBeInTheDocument()
  })

  it('renders with the red accent when alert is true', () => {
    render(
      <StatCard
        title="Errors"
        value="3"
        subtitle="Issues found"
        icon={MockIcon}
        accent="red"
        alert
      />
    )
    expect(screen.getByText('Errors')).toBeInTheDocument()
  })

  it('renders with emerald accent', () => {
    render(
      <StatCard
        title="Active Users"
        value="42"
        subtitle="Online now"
        icon={MockIcon}
        accent="emerald"
      />
    )
    expect(screen.getByText('Active Users')).toBeInTheDocument()
  })
})