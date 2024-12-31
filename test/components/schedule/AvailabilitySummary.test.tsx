import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvailabilitySummary } from '@/components/schedule/AvailabilitySummary';
import { createClient } from '@/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock data
const mockEmployees = [
  { id: 'user1' },
  { id: 'user2' },
  { id: 'user3' },
];

const mockPatterns = [
  {
    id: '1',
    employee_id: 'user1',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
  },
  {
    id: '2',
    employee_id: 'user1',
    day_of_week: 2,
    start_time: '09:00',
    end_time: '17:00',
  },
  {
    id: '3',
    employee_id: 'user2',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '18:00',
  },
];

// Create a mock Supabase client
const mockSupabaseClient = {
  from: vi.fn((table) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ 
          data: table === 'profiles' ? mockEmployees : null,
          error: null 
        })),
      })),
      in: vi.fn(() => Promise.resolve({ 
        data: mockPatterns,
        error: null 
      })),
    })),
  })),
} as unknown as SupabaseClient;

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('AvailabilitySummary', () => {
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
        <AvailabilitySummary organizationId="org1" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading availability statistics...')).toBeInTheDocument();
  });

  it('displays availability statistics correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AvailabilitySummary organizationId="org1" />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading availability statistics...')).not.toBeInTheDocument();
    });

    // Check if statistics are displayed
    expect(screen.getByText('3')).toBeInTheDocument(); // Total employees
    expect(screen.getByText(/Fully Available:/)).toBeInTheDocument();
    expect(screen.getByText(/Partially Available:/)).toBeInTheDocument();
    expect(screen.getByText(/Unavailable:/)).toBeInTheDocument();
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
        <AvailabilitySummary organizationId="org1" />
      </QueryClientProvider>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.queryByText('Loading availability statistics...')).not.toBeInTheDocument();
    });
  });

  it('calculates statistics correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AvailabilitySummary organizationId="org1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading availability statistics...')).not.toBeInTheDocument();
    });

    // Check specific statistics
    expect(screen.getByText('Monday')).toBeInTheDocument(); // Most available day
    expect(screen.getByText(/Hours per employee/)).toBeInTheDocument();
  });
}); 