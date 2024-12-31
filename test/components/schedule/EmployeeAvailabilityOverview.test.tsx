import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EmployeeAvailabilityOverview } from '@/components/schedule/EmployeeAvailabilityOverview';
import { createClient } from '@/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock data
const mockEmployees = [
  {
    id: 'user1',
    email: 'john@example.com',
    full_name: 'John Doe',
  },
  {
    id: 'user2',
    email: 'jane@example.com',
    full_name: 'Jane Smith',
  },
];

// Create a mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockEmployees, error: null })),
      })),
    })),
  })),
} as unknown as SupabaseClient;

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('EmployeeAvailabilityOverview', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeeAvailabilityOverview organizationId="org1" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading employees...')).toBeInTheDocument();
  });

  it('displays employee list correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeeAvailabilityOverview organizationId="org1" />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading employees...')).not.toBeInTheDocument();
    });

    // Check if employees are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('allows expanding employee details', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <EmployeeAvailabilityOverview organizationId="org1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading employees...')).not.toBeInTheDocument();
    });

    // Click on an employee
    fireEvent.click(screen.getByText('John Doe'));

    // Calendar should be visible
    await waitFor(() => {
      expect(screen.getByText('Availability Calendar')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully', async () => {
    // Mock an error response
    const mockErrorClient = {
      ...mockSupabaseClient,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: new Error('Failed to fetch') })),
          })),
        })),
      })),
    } as unknown as SupabaseClient;

    const mockedCreateClient = vi.mocked(createClient, { partial: true });
    mockedCreateClient.mockImplementationOnce(() => mockErrorClient);

    render(
      <QueryClientProvider client={queryClient}>
        <EmployeeAvailabilityOverview organizationId="org1" />
      </QueryClientProvider>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.queryByText('Loading employees...')).not.toBeInTheDocument();
    });
  });
}); 