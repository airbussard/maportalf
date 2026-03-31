'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronUp, ArrowLeft } from 'lucide-react'
import { getNavData } from './sidebar-nav-data'
import { SidebarMenuItem } from './sidebar-menu-item'
import { useSidebarContext } from './sidebar-context'

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { setIsOpen, isOpen, isMobile, toggleSidebar } = useSidebarContext()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const navData = getNavData(role)

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => (prev.includes(title) ? [] : [title]))
  }

  // Auto-expand parent when a sub-page is active
  useEffect(() => {
    navData.some((section) =>
      section.items.some((item) =>
        item.items.some((subItem) => {
          if (subItem.url === pathname) {
            if (!expandedItems.includes(item.title)) {
              toggleExpanded(item.title)
            }
            return true
          }
          return false
        }),
      ),
    )
  }, [pathname])

  const isActive = (url: string) => {
    if (url === '/dashboard') return pathname === '/dashboard'
    return pathname === url || pathname.startsWith(url + '/')
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'max-w-[290px] overflow-hidden border-r border-border bg-background transition-[width] duration-200 ease-linear dark:bg-card',
          isMobile ? 'fixed bottom-0 top-0 z-50' : 'sticky top-0 h-screen',
          isOpen ? 'w-full' : 'w-0',
        )}
        aria-label="Hauptnavigation"
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
      >
        <div className="flex h-full flex-col py-6 pl-6 pr-2">
          {/* Logo + Close Button */}
          <div className="relative pr-4 mb-2">
            <Link
              href="/dashboard"
              onClick={() => isMobile && toggleSidebar()}
              className="block py-2"
            >
              <Image
                src="/logo.png"
                alt="FLIGHTHOUR"
                width={160}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 hover:bg-accent"
              >
                <span className="sr-only">Menü schließen</span>
                <ArrowLeft className="size-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="sidebar-scrollbar mt-4 flex-1 overflow-y-auto pr-3">
            {navData.map((section) => (
              <div key={section.label} className="mb-6">
                <h2 className="mb-3 px-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </h2>

                <nav role="navigation" aria-label={section.label}>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.title}>
                        {item.items.length > 0 ? (
                          // Expandable menu item with sub-items
                          <div>
                            <SidebarMenuItem
                              isActive={item.items.some(
                                ({ url }) => isActive(url),
                              )}
                              isHighlight={item.highlight}
                              onClick={() => toggleExpanded(item.title)}
                            >
                              <item.icon
                                className="size-5 shrink-0"
                                aria-hidden="true"
                              />
                              <span>{item.title}</span>
                              <ChevronUp
                                className={cn(
                                  'ml-auto size-4 rotate-180 transition-transform duration-200',
                                  expandedItems.includes(item.title) && 'rotate-0',
                                )}
                                aria-hidden="true"
                              />
                            </SidebarMenuItem>

                            {expandedItems.includes(item.title) && (
                              <ul className="ml-9 space-y-1 pb-2 pt-1" role="menu">
                                {item.items.map((subItem) => (
                                  <li key={subItem.title} role="none">
                                    <SidebarMenuItem
                                      as="link"
                                      href={subItem.url}
                                      isActive={isActive(subItem.url)}
                                    >
                                      <span>{subItem.title}</span>
                                    </SidebarMenuItem>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          // Direct link menu item
                          <SidebarMenuItem
                            className="flex items-center gap-3 py-2.5"
                            as="link"
                            href={item.url || '/'}
                            isActive={isActive(item.url || '/')}
                            isHighlight={item.highlight}
                          >
                            <item.icon
                              className="size-5 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{item.title}</span>
                          </SidebarMenuItem>
                        )}
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            ))}
          </div>

          {/* Version Footer */}
          <div className="mt-auto border-t border-border pt-4 pr-3">
            <p className="text-[10px] text-muted-foreground text-center">
              FLIGHTHOUR v2.230
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
