"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  {
    title: 'Overview',
    href: '/dashboard',
  },
  {
    title: 'Schedule',
    href: '/dashboard/schedule',
  },
  {
    title: 'Availability',
    href: '/dashboard/availability',
  },
  {
    title: 'Time Off',
    href: '/dashboard/timeoff',
  },
  {
    title: 'Employees',
    href: '/dashboard/employees',
  },
]

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname()

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            pathname === item.href
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
} 