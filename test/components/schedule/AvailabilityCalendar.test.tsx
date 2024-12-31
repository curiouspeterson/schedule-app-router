import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AvailabilityCalendar } from '@/components/schedule/AvailabilityCalendar';
import { createClient } from '@/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock data
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
    day_of_week: 3,
    start_time: '10:00',
    end_time: '18:00',
  },
];

// Create a mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockPatterns, error: null })),
      })),
    })),
  })),
} as unknown as SupabaseClient;

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('AvailabilityCalendar', () => {
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
        <AvailabilityCalendar employeeId="user1" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('displays availability patterns correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AvailabilityCalendar employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Check if days are displayed
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();

    // Check if time slots are displayed
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('17:00')).toBeInTheDocument();
  });

  it('allows navigation between weeks', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AvailabilityCalendar employeeId="user1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });

    // Get initial date range
    const initialDateText = screen.getByText(/\w+ \d+ - \w+ \d+, \d{4}/);
    const initialDate = initialDateText.textContent;

    // Click next week button
    fireEvent.click(screen.getByLabelText('Next week'));

    // Date range should be different
    await waitFor(() => {
      const newDateText = screen.getByText(/\w+ \d+ - \w+ \d+, \d{4}/);
      expect(newDateText.textContent).not.toBe(initialDate);
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
        <AvailabilityCalendar employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.queryByText('Loading calendar...')).not.toBeInTheDocument();
    });
  });
}); 