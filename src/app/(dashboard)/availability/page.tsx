import { type Metadata } from "next"
import { AvailabilityForm } from "@/components/availability/AvailabilityForm"

export const metadata: Metadata = {
  title: "Availability | ScheduleMe",
  description: "Manage your work availability",
}

export default function AvailabilityPage() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Availability</h1>
          <p className="text-muted-foreground">
            Set your preferred working hours and availability
          </p>
        </div>
      </div>
      <AvailabilityForm />
    </div>
  )
} 