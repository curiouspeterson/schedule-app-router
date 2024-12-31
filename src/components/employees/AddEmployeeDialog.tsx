import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AddEmployeeDialogProps {
  organizationId: string
  onEmployeeAdded: () => void
}

export function AddEmployeeDialog({ organizationId, onEmployeeAdded }: AddEmployeeDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const fullName = formData.get('fullName') as string
    const isManager = formData.get('isManager') === 'on'
    const weeklyHoursLimit = formData.get('weeklyHoursLimit') as string

    try {
      // Create auth user with a temporary password
      const tempPassword = Math.random().toString(36).slice(-8)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (authError) throw authError

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: organizationId,
          is_manager: isManager,
          weekly_hours_limit: weeklyHoursLimit ? parseInt(weeklyHoursLimit) : null,
        })
        .eq('id', authData.user!.id)

      if (profileError) throw profileError

      // TODO: Send invitation email with temporary password

      setOpen(false)
      onEmployeeAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="employee@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              required
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeklyHoursLimit">Weekly Hours Limit</Label>
            <Input
              id="weeklyHoursLimit"
              name="weeklyHoursLimit"
              type="number"
              min="0"
              placeholder="40"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isManager" name="isManager" />
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
              {loading ? 'Adding...' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 