'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface UserSettings {
  user_id: string
  email_notifications: boolean
  schedule_reminders: boolean
}

export default function SettingsPage() {
  const supabase = createClient()
  const { toast } = useToast()

  const { data: settings, isLoading } = useQuery<UserSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || {
        user_id: user.id,
        email_notifications: true,
        schedule_reminders: true,
      }
    },
  })

  const updateSetting = async (key: keyof Omit<UserSettings, 'user_id'>, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        [key]: value,
      })

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-32">
          <p className="text-lg text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications about your schedule
              </p>
            </div>
            <Switch
              checked={settings?.email_notifications}
              onCheckedChange={(checked: boolean) => updateSetting('email_notifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Schedule Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get reminders about upcoming shifts
              </p>
            </div>
            <Switch
              checked={settings?.schedule_reminders}
              onCheckedChange={(checked: boolean) => updateSetting('schedule_reminders', checked)}
            />
          </div>
          <div className="pt-4">
            <Button variant="destructive" onClick={() => {}}>
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 