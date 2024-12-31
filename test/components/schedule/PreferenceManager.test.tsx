import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreferenceManager } from '@/components/schedule/PreferenceManager';
import { createClient } from '@/lib/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock data
const mockShifts = [
  {
    id: '1',
    name: 'Morning Shift',
    start_time: '09:00',
    end_time: '17:00',
  },
  {
    id: '2',
    name: 'Evening Shift',
    start_time: '17:00',
    end_time: '01:00',
  },
];

const mockPreferences = [
  {
    id: '1',
    employee_id: 'user1',
    shift_id: '1',
    preference_level: 'preferred',
    shift: mockShifts[0],
  },
  {
    id: '2',
    employee_id: 'user1',
    shift_id: '2',
    preference_level: 'neutral',
    shift: mockShifts[1],
  },
];

// Create a mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockPreferences, error: null })),
      })),
    })),
    upsert: vi.fn(() => Promise.resolve({ error: null })),
  })),
  auth: {
    getUser: vi.fn(),
    signOut: vi.fn(),
  },
  realtime: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
  rest: {
    get: vi.fn(),
    post: vi.fn(),
  },
  supabaseUrl: 'mock-url',
  supabaseKey: 'mock-key',
} as unknown as SupabaseClient;

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('PreferenceManager', () => {
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

  it('renders shift preferences correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PreferenceManager employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByText('Morning Shift')).toBeInTheDocument();
      expect(screen.getByText('Evening Shift')).toBeInTheDocument();
    });

    // Check preference levels are displayed
    expect(screen.getByText('Preferred')).toBeInTheDocument();
    expect(screen.getByText('Neutral')).toBeInTheDocument();
  });

  it('allows editing preferences', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PreferenceManager employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByText('Morning Shift')).toBeInTheDocument();
    });

    // Click edit button
    fireEvent.click(screen.getByText('Edit Preferences'));

    // Check if select elements are rendered
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // Change a preference
    fireEvent.click(selects[0]);
    fireEvent.click(screen.getByText('Avoid'));

    // Save changes
    fireEvent.click(screen.getByText('Save Changes'));

    // Verify Supabase client was called with correct arguments
    await waitFor(() => {
      expect(createClient().from).toHaveBeenCalledWith('shift_preferences');
      expect(createClient().from().upsert).toHaveBeenCalled();
    });
  });

  it('handles canceling edits', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PreferenceManager employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for preferences to load
    await waitFor(() => {
      expect(screen.getByText('Morning Shift')).toBeInTheDocument();
    });

    // Click edit button
    fireEvent.click(screen.getByText('Edit Preferences'));

    // Change a preference
    const selects = screen.getAllByRole('combobox');
    fireEvent.click(selects[0]);
    fireEvent.click(screen.getByText('Avoid'));

    // Cancel changes
    fireEvent.click(screen.getByText('Cancel'));

    // Verify original preference is still displayed
    await waitFor(() => {
      expect(screen.getByText('Preferred')).toBeInTheDocument();
    });
  });

  it('displays loading state', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PreferenceManager employeeId="user1" />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading shift preferences...')).toBeInTheDocument();
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
        <PreferenceManager employeeId="user1" />
      </QueryClientProvider>
    );

    // Wait for error to be handled
    await waitFor(() => {
      expect(screen.queryByText('Loading shift preferences...')).not.toBeInTheDocument();
    });
  });
}); 