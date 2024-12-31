import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Schedule | ScheduleMe",
  description: "View and manage your schedule",
}

export default function SchedulePage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground">
            View and manage your work schedule
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Total Hours</h3>
          </div>
          <div className="text-2xl font-bold">40h</div>
          <p className="text-xs text-muted-foreground">
            This week
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Upcoming Shifts</h3>
          </div>
          <div className="text-2xl font-bold">5</div>
          <p className="text-xs text-muted-foreground">
            Next 7 days
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Time Off</h3>
          </div>
          <div className="text-2xl font-bold">2</div>
          <p className="text-xs text-muted-foreground">
            Pending requests
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="text-sm font-medium">Schedule Changes</h3>
          </div>
          <div className="text-2xl font-bold">3</div>
          <p className="text-xs text-muted-foreground">
            Last 30 days
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4">
          <h2 className="text-xl font-semibold">Weekly Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Your upcoming shifts for this week
          </p>
        </div>
        <div className="p-4">
          {/* TODO: Add weekly schedule calendar component */}
          <div className="h-[400px] rounded-lg border border-dashed flex items-center justify-center">
            <p className="text-muted-foreground">Weekly schedule calendar coming soon</p>
          </div>
        </div>
      </div>
    </div>
  )
} 