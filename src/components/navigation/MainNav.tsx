"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface MainNavProps {
  isManager: boolean
}

export function MainNav({ isManager }: MainNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/dashboard"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/dashboard"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        Overview
      </Link>
      <Link
        href="/schedule"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/schedule"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        Schedule
      </Link>
      <Link
        href="/availability"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/availability"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        Availability
      </Link>
      <Link
        href="/timeoff"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/timeoff"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        Time Off
      </Link>
      {isManager && (
        <>
          <Link
            href="/employees"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/employees"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            Employees
          </Link>
          <Link
            href="/shifts"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/shifts"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            Shifts
          </Link>
        </>
      )}
    </nav>
  )
}