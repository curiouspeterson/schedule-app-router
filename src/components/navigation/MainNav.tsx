"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { UserMenu } from "./UserMenu"

interface MainNavProps {
  isManager: boolean
}

export function MainNav({ isManager }: MainNavProps) {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
    {
      href: "/schedule",
      label: "Schedule",
      active: pathname === "/schedule",
    },
    {
      href: "/availability",
      label: "Availability",
      active: pathname === "/availability",
    },
    {
      href: "/time-off",
      label: "Time Off",
      active: pathname === "/time-off",
    },
    ...(isManager
      ? [
          {
            href: "/manager/employees",
            label: "Employees",
            active: pathname === "/manager/employees",
          },
          {
            href: "/manager/shifts",
            label: "Shifts",
            active: pathname === "/manager/shifts",
          },
          {
            href: "/manager/reports",
            label: "Reports",
            active: pathname === "/manager/reports",
          },
        ]
      : []),
  ]

  return (
    <div className="flex h-16 items-center px-4 border-b">
      <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
        <span className="hidden font-bold sm:inline-block">ScheduleMe</span>
      </Link>
      <nav className="flex items-center space-x-6 text-sm font-medium">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "transition-colors hover:text-foreground/80",
              route.active ? "text-foreground" : "text-foreground/60"
            )}
          >
            {route.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center space-x-4">
        <UserMenu />
      </div>
    </div>
  )
} 