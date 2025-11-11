import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import React from 'react';
import StatCard from './StatCard.jsx';

function MockIcon(props) {
  return <svg data-testid="mock-icon" {...props} />;
}

describe('StatCard', () => {
  it('renders title and value correctly', () => {
    render(
      <StatCard
        title="Total Articles"
        value={42}
        icon={<MockIcon />}
        color="#4CAF50"
      />
    );

    expect(screen.getByText('Total Articles')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });
});
