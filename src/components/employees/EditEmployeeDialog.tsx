import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'

interface Employee {
  id: string
  full_name: string
  email: string
  is_manager: boolean
  weekly_hours_limit: number | null
}

interface EditEmployeeDialogProps {
  employee: Employee
  onEmployeeUpdated: () => void
}

export function EditEmployeeDialog({ employee, onEmployeeUpdated }: EditEmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const fullName = formData.get('fullName') as string
    const isManager = formData.get('isManager') === 'on'
    const weeklyHoursLimit = formData.get('weeklyHoursLimit') as string

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          is_manager: isManager,
          weekly_hours_limit: weeklyHoursLimit ? parseInt(weeklyHoursLimit) : null,
        })
        .eq('id', employee.id)

      if (profileError) throw profileError

      setOpen(false)
      onEmployeeUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={employee.email}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              defaultValue={employee.full_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyHoursLimit">Weekly Hours Limit</Label>
            <Input
              id="weeklyHoursLimit"
              name="weeklyHoursLimit"
              type="number"
              min="0"
              defaultValue={employee.weekly_hours_limit || ''}
              placeholder="40"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isManager"
              name="isManager"
              defaultChecked={employee.is_manager}
            />
            <Label htmlFor="isManager">Is Manager</Label>
          </div>
          {error && (
            <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 