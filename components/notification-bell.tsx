'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, type Notification } from '@/app/actions/notifications'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { de } from 'date-fns/locale'
import { isChristmasPeriod } from '@/components/festive-effects'

interface NotificationBellProps {
  role: string
}

export function NotificationBell({ role }: NotificationBellProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Only show for Manager/Admin
  if (role !== 'manager' && role !== 'admin') {
    return null
  }

  // Load notifications when popover opens
  useEffect(() => {
    if (isOpen && !isLoading) {
      loadNotifications()
    }
  }, [isOpen])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    setIsLoading(true)
    const data = await getNotifications()
    setNotifications(data)
    setIsLoading(false)
  }

  const loadUnreadCount = async () => {
    const count = await getUnreadCount()
    setUnreadCount(count)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
    }

    // Navigate if there's a link
    if (notification.link) {
      setIsOpen(false)
      router.push(notification.link)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_ticket':
        return '🎫'
      case 'work_request':
        return '📅'
      case 'ticket_assignment':
        return '👤'
      case 'ticket_reply':
        return '💬'
      default:
        return '🔔'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <div className="relative">
            <Bell className="h-5 w-5" />
            {isChristmasPeriod() && (
              <span className="absolute -top-1.5 -right-1.5 text-[10px]">🎀</span>
            )}
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Benachrichtigungen</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              Alle als gelesen markieren
            </Button>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Laden...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Keine Benachrichtigungen
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full p-4 border-b hover:bg-accent transition-colors text-left ${
                  !notification.read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: de
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="p-2 border-t bg-muted/30">
            <p className="text-xs text-center text-muted-foreground">
              Die 10 neuesten Benachrichtigungen
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
