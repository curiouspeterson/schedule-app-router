"use client"

import { useState } from 'react'

export function AvailabilityForm() {
  const [minHours, setMinHours] = useState('20')
  const [maxHours, setMaxHours] = useState('40')

  const handleSaveChanges = () => {
    // TODO: Implement save functionality
    console.log('Saving changes...')
  }

  const handleClearAll = () => {
    // TODO: Implement clear functionality
    console.log('Clearing all...')
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_300px]">
      {/* Main Calendar Area */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Weekly Availability</h2>
          <p className="text-sm text-muted-foreground">
            Click and drag to set your available hours
          </p>
        </div>
        <div className="p-4">
          {/* TODO: Add weekly availability calendar component */}
          <div className="h-[500px] rounded-lg border border-dashed flex items-center justify-center">
            <p className="text-muted-foreground">Weekly availability calendar coming soon</p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Quick Actions */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={handleSaveChanges}
              className="w-full px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </button>
            <button
              onClick={handleClearAll}
              className="w-full px-4 py-2 text-sm rounded-md border hover:bg-accent hover:text-accent-foreground"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Saved Templates */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Saved Templates</h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 text-sm text-left rounded-md hover:bg-accent hover:text-accent-foreground">
              Standard Week
            </button>
            <button className="w-full px-4 py-2 text-sm text-left rounded-md hover:bg-accent hover:text-accent-foreground">
              Summer Hours
            </button>
            <button className="w-full px-4 py-2 text-sm text-left rounded-md hover:bg-accent hover:text-accent-foreground">
              Holiday Schedule
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Preferences</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                Minimum Hours per Week
              </label>
              <input
                type="number"
                value={minHours}
                onChange={(e) => setMinHours(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                placeholder="20"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Maximum Hours per Week
              </label>
              <input
                type="number"
                value={maxHours}
                onChange={(e) => setMaxHours(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background"
                placeholder="40"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 