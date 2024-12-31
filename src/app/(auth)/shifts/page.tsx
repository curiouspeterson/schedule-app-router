'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import type { Database } from '@/types/supabase'

type Shift = Database['public']['Tables']['shifts']['Row']
type NewShift = Omit<Shift, 'id' | 'created_at' | 'updated_at'>

export default function ShiftsPage() {
  const supabase = createClient()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [newShiftName, setNewShiftName] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')

  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('start_time')

      if (error) throw error
      return data
    },
  })

  const createShiftMutation = useMutation({
    mutationFn: async (newShift: NewShift) => {
      const { data, error } = await supabase
        .from('shifts')
        .insert([newShift])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast({
        title: 'Success',
        description: 'Shift created successfully',
      })
      setNewShiftName('')
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to create shift',
        variant: 'destructive',
      })
    },
  })

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
      toast({
        title: 'Success',
        description: 'Shift deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete shift',
        variant: 'destructive',
      })
    },
  })

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newShiftName || !startTime || !endTime) return

    const start = new Date(`2000-01-01T${startTime}:00`)
    const end = new Date(`2000-01-01T${endTime}:00`)
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

    createShiftMutation.mutate({
      name: newShiftName,
      start_time: startTime,
      end_time: endTime,
      duration_hours: duration,
    })
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Shift Management</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Shift</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="Shift Name"
                value={newShiftName}
                onChange={(e) => setNewShiftName(e.target.value)}
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <Button type="submit">Create Shift</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Shifts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading shifts...</p>
          ) : !shifts?.length ? (
            <p className="text-muted-foreground">No shifts found</p>
          ) : (
            shifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-medium">
                    {shift.name} ({shift.duration_hours} hours)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(`2000-01-01T${shift.start_time}`), 'h:mm a')} - {format(new Date(`2000-01-01T${shift.end_time}`), 'h:mm a')}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteShiftMutation.mutate(shift.id)}
                >
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
} 