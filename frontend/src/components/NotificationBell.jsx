import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { toast } from 'react-toastify'
import api from '../services/api'

const NotificationBell = ({ basePath = '/student' }) => {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const fetchList = async () => {
    try {
      const res = await api.get('/notifications')
      setItems(res.data.items)
      setUnread(res.data.unread_count)
    } catch (error) {
      // silent: polling must not spam toasts
    }
  }

  useEffect(() => {
    fetchList()
    const timer = setInterval(fetchList, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    if (next) await fetchList()
  }

  const handleSelect = async (item) => {
    try {
      if (!item.read) {
        const res = await api.post(`/notifications/${item.id}/read`)
        setUnread(res.data.unread_count)
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))
      }
      setOpen(false)
      if (item.complaint_id) {
        navigate(`${basePath}/complaints/${item.complaint_id}`)
      }
    } catch (error) {
      toast.error('Failed to open notification')
    }
  }

  const handleMarkAll = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (error) {
      toast.error('Failed to mark notifications as read')
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-600 rounded-full">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-500"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors ${
                    item.read ? '' : 'bg-blue-50/60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary-600" />
                    )}
                    <div className={item.read ? 'pl-4' : ''}>
                      <p className="text-sm text-gray-900">{item.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.complaint_number ? `${item.complaint_number} · ` : ''}
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
