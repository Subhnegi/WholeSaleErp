import { useEffect, useState, useRef } from 'react'
import { Wifi, WifiOff, Download, Clock, CheckCircle2, AlertCircle, RefreshCw, Bell, Calendar, ChevronLeft, ChevronRight, Languages, Calculator, Keyboard, HardDrive } from 'lucide-react'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setLanguage,
  SUPPORTED_LANGUAGES,
  type Language
} from '@/store/slices/preferencesSlice'
import { BackupRestoreModal } from './BackupRestoreModal'
import { useTranslation } from '@/hooks/useTranslation'

interface UpdateStatus {
  checking: boolean
  available: boolean
  downloading: boolean
  downloaded: boolean
  progress?: number
  error?: string
  message?: string
}

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface StatusBarProps {
  onToggleRightSidebar?: () => void
  showCalculator?: boolean
  onToggleCalculator?: () => void
}

export function StatusBar({ onToggleRightSidebar, showCalculator: externalShowCalculator, onToggleCalculator }: StatusBarProps = {}) {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(false) // Start with false, will update immediately
  const [lastBackup, setLastBackup] = useState<Date | null>(null) // TASK 3: Show last backup date
  const [showBackupRestore, setShowBackupRestore] = useState(false)
  const dispatch = useAppDispatch()
  const preferences = useAppSelector((state) => state.preferences)
  const [appVersion, setAppVersion] = useState<string>('1.0.0')
  const [lastUpdateCheck, setLastUpdateCheck] = useState<Date | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false
  })
  const [isCheckingManually, setIsCheckingManually] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'System Update',
      message: 'A new version is available for download',
      timestamp: new Date(Date.now() - 3600000),
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Backup Complete',
      message: 'Your data has been successfully backed up',
      timestamp: new Date(Date.now() - 7200000),
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'License Expiring',
      message: 'Your license will expire in 7 days',
      timestamp: new Date(Date.now() - 86400000),
      read: true
    }
  ])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(false)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const calendarRef = useRef<HTMLDivElement>(null)
  const [internalShowCalculator, setInternalShowCalculator] = useState(false)
  const showCalculator = externalShowCalculator !== undefined ? externalShowCalculator : internalShowCalculator
  const [calcDisplay, setCalcDisplay] = useState('')
  const [calcPrevValue, setCalcPrevValue] = useState<number | null>(null)
  const [calcOperation, setCalcOperation] = useState<string | null>(null)
  const [calcNewNumber, setCalcNewNumber] = useState(true)
  const calculatorRef = useRef<HTMLDivElement>(null)
  const calcInputRef = useRef<HTMLInputElement>(null)

  // Focus calculator input when it opens
  useEffect(() => {
    if (showCalculator && calcInputRef.current) {
      calcInputRef.current.focus()
    }
  }, [showCalculator])

  const handleCheckForUpdates = async () => {
    if (isCheckingManually || updateStatus.checking || updateStatus.downloading) return
    
    try {
      setIsCheckingManually(true)
      if (window.api?.app?.checkForUpdates) {
        const result = await window.api.app.checkForUpdates()
        if (!result.success && result.error) {
          console.error('Manual update check failed:', result.error)
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error)
    } finally {
      // Keep the button disabled for 2 seconds to prevent spam clicking
      setTimeout(() => {
        setIsCheckingManually(false)
      }, 2000)
    }
  }

  // Handle notification icon click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
  }

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
      if (calculatorRef.current && !calculatorRef.current.contains(event.target as Node)) {
        if (onToggleCalculator && showCalculator) {
          onToggleCalculator()
        } else if (!onToggleCalculator) {
          setInternalShowCalculator(false)
        }
      }
    }

    if (showNotifications || showCalendar || showCalculator) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications, showCalendar, showCalculator, onToggleCalculator])

  // Update current date/time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Mark notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Get unread notification count
  const unreadCount = notifications.filter(n => !n.read).length

  // Get app version
  useEffect(() => {
    if (window.api?.app) {
      window.api.app.getVersion().then(version => {
        setAppVersion(version)
      }).catch(() => {
        setAppVersion('1.0.0')
      })
    }
  }, [])

  // TASK 3: Load last backup date when component mounts
  useEffect(() => {
    const loadLastBackupDate = async () => {
      try {
        console.log('[StatusBar] Loading last backup info...')
        if (window.api?.backup?.getLastBackupInfo) {
          const result = await window.api.backup.getLastBackupInfo()
          console.log('[StatusBar] Last backup info result:', result)
          if (result.success && result.lastBackup) {
            const backupDate = new Date(result.lastBackup)
            console.log('[StatusBar] Setting last backup date:', backupDate)
            setLastBackup(backupDate)
          } else {
            console.log('[StatusBar] No last backup found')
            setLastBackup(null)
          }
        } else {
          console.error('[StatusBar] backup.getLastBackupInfo API not available')
        }
      } catch (error) {
        console.error('[StatusBar] Failed to load last backup info:', error)
      }
    }
    
    loadLastBackupDate()
  }, [])

  // Callback to refresh last backup date when a new backup is created
  const handleBackupCreated = async () => {
    try {
      console.log('[StatusBar] Refreshing last backup info after backup creation...')
      if (window.api?.backup?.getLastBackupInfo) {
        const result = await window.api.backup.getLastBackupInfo()
        console.log('[StatusBar] Refreshed last backup info result:', result)
        if (result.success && result.lastBackup) {
          const backupDate = new Date(result.lastBackup)
          console.log('[StatusBar] Updated last backup date:', backupDate)
          setLastBackup(backupDate)
        }
      }
    } catch (error) {
      console.error('[StatusBar] Failed to refresh last backup info:', error)
    }
  }

  // Load update info from database on mount
  useEffect(() => {
    if (window.api?.db) {
      window.api.db.getUpdateInfo().then(updateInfo => {
        if (updateInfo) {
          console.log('Loaded update info from database:', updateInfo)
          setLastUpdateCheck(new Date(updateInfo.lastCheckDate))
          if (updateInfo.updateAvailable && updateInfo.availableVersion) {
            setAvailableVersion(updateInfo.availableVersion)
            setUpdateStatus(prev => ({
              ...prev,
              available: true,
              message: `${t('statusBar.updateAvailable')}${updateInfo.availableVersion}`
            }))
          }
        }
      }).catch(err => {
        console.error('Failed to load update info:', err)
      })
    }
  }, [])

  // TASK 3: Format last backup date
  const formatLastBackup = (date: Date | null): string => {
    if (!date) return t('statusBar.never')
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return t('statusBar.justNow')
    if (diffMins < 60) return t('statusBar.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('statusBar.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('statusBar.daysAgo', { count: diffDays })
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Listen for online/offline status with immediate update and proper event handling
  useEffect(() => {
    // Function to check actual network connectivity via main process
    const checkActualConnectivity = async () => {
      try {
        // Use main process to perform actual DNS lookup
        if (window.api?.app?.checkConnectivity) {
          const online = await window.api.app.checkConnectivity()
          console.log('Network connectivity check:', online ? 'Online' : 'Offline')
          setIsOnline(online)
          return online
        } else {
          // Fallback to navigator.onLine if IPC not available
          const online = navigator.onLine
          console.log('Network connectivity check (fallback):', online ? 'Online' : 'Offline')
          setIsOnline(online)
          return online
        }
      } catch (error) {
        console.log('Network connectivity check failed, using navigator.onLine', error)
        const online = navigator.onLine
        setIsOnline(online)
        return online
      }
    }
    
    // Initial check
    checkActualConnectivity()
    
    const handleOnline = () => {
      console.log('Network event: Online')
      checkActualConnectivity()
    }
    
    const handleOffline = () => {
      console.log('Network event: Offline')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Poll every 5 seconds to verify actual connectivity via DNS
    const pollInterval = setInterval(() => {
      checkActualConnectivity()
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(pollInterval)
    }
  }, [])

  // Listen for update status from main process
  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleUpdateStatus = (_event: unknown, data: {
      type: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
      message?: string
      progress?: number
      version?: string
    }) => {
      console.log('Update status received:', data)

      switch (data.type) {
        case 'checking':
          setLastUpdateCheck(new Date())
          setUpdateStatus({
            checking: true,
            available: false,
            downloading: false,
            downloaded: false,
            message: 'Checking for updates...'
          })
          break
        
        case 'available':
          setLastUpdateCheck(new Date())
          setAvailableVersion(data.version || null)
          setUpdateStatus({
            checking: false,
            available: true,
            downloading: false,
            downloaded: false,
            message: `${t('statusBar.updateAvailable')}${data.version}`
          })
          break
        
        case 'not-available':
          setLastUpdateCheck(new Date())
          setAvailableVersion(null)
          setUpdateStatus({
            checking: false,
            available: false,
            downloading: false,
            downloaded: false,
            message: t('statusBar.upToDate')
          })
          // Clear message after 3 seconds
          setTimeout(() => {
            setUpdateStatus(prev => ({ ...prev, message: undefined }))
          }, 3000)
          break
        
        case 'downloading':
          setUpdateStatus({
            checking: false,
            available: true,
            downloading: true,
            downloaded: false,
            progress: data.progress,
            message: data.message || `${t('statusBar.downloading')} ${data.progress?.toFixed(1)}%`
          })
          break
        
        case 'downloaded':
          setUpdateStatus({
            checking: false,
            available: true,
            downloading: false,
            downloaded: true,
            message: t('statusBar.updateReadyToInstall')
          })
          break
        
        case 'error':
          setUpdateStatus({
            checking: false,
            available: false,
            downloading: false,
            downloaded: false,
            error: data.message,
            message: t('statusBar.updateCheckFailed')
          })
          // Clear error after 5 seconds
          setTimeout(() => {
            setUpdateStatus(prev => ({ ...prev, error: undefined, message: undefined }))
          }, 5000)
          break
      }
    }

    window.electron.ipcRenderer.on('update-status', handleUpdateStatus)

    return () => {
      window.electron.ipcRenderer.removeListener('update-status', handleUpdateStatus)
    }
  }, [])

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Never'
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUpdateIcon = () => {
    if (updateStatus.checking) {
      return <Clock className="w-3.5 h-3.5 animate-spin" />
    }
    if (updateStatus.downloading) {
      return <Download className="w-3.5 h-3.5 animate-pulse" />
    }
    if (updateStatus.downloaded) {
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
    }
    if (updateStatus.error) {
      return <AlertCircle className="w-3.5 h-3.5 text-red-500" />
    }
    if (updateStatus.available) {
      return <Download className="w-3.5 h-3.5 text-blue-500" />
    }
    return null
  }

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const formatNotificationTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('statusBar.justNow')
    if (minutes < 60) return t('statusBar.minutesAgo', { count: minutes })
    if (hours < 24) return t('statusBar.hoursAgo', { count: hours })
    if (days === 1) return t('statusBar.yesterday')
    return t('statusBar.daysAgo', { count: days })
  }

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month, 1).getDay()
  }

  const formatCurrentDateTime = () => {
    return currentDateTime.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCalendarDate(new Date())
  }

  // Calculator functions
  const handleCalcNumber = (num: string) => {
    if (calcNewNumber) {
      setCalcDisplay(num)
      setCalcNewNumber(false)
    } else {
      setCalcDisplay(calcDisplay + num)
    }
  }

  const handleCalcOperation = (op: string) => {
    if (!calcDisplay) return
    
    const current = parseFloat(calcDisplay)
    if (calcPrevValue !== null && calcOperation && !calcNewNumber) {
      const result = performCalculation(calcPrevValue, current, calcOperation)
      setCalcDisplay('')
      setCalcPrevValue(result)
    } else {
      setCalcPrevValue(current)
      setCalcDisplay('')
    }
    setCalcOperation(op)
    setCalcNewNumber(true)
  }

  const performCalculation = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current
      case '-': return prev - current
      case '*': return prev * current
      case '/': return current !== 0 ? prev / current : 0
      default: return current
    }
  }

  const handleCalcEquals = () => {
    if (!calcDisplay) return
    
    if (calcPrevValue !== null && calcOperation) {
      const current = parseFloat(calcDisplay)
      const result = performCalculation(calcPrevValue, current, calcOperation)
      setCalcDisplay(result.toString())
      setCalcPrevValue(null)
      setCalcOperation(null)
      setCalcNewNumber(true)
    }
  }

  const handleCalcClear = () => {
    setCalcDisplay('')
    setCalcPrevValue(null)
    setCalcOperation(null)
    setCalcNewNumber(true)
  }

  const handleCalcDecimal = () => {
    if (calcNewNumber) {
      setCalcDisplay('0.')
      setCalcNewNumber(false)
    } else if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.')
    }
  }

  const handleLanguageChange = (newLanguage: Language) => {
    dispatch(setLanguage(newLanguage))
    const langName = SUPPORTED_LANGUAGES.find(l => l.code === newLanguage)?.nativeName
    toast.success(`${t('statusBar.languageChanged')} ${langName}`)
  }

  return (
    <div className="h-6 bg-[#007ACC] text-white text-xs flex items-center justify-between px-3 select-none border-t border-[#005A9E]">
      {/* Left section - Online status and Language */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-medium">{t('statusBar.online')}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span className="font-medium">{t('statusBar.offline')}</span>
            </>
          )}
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1.5">
          <Languages className="w-3.5 h-3.5" />
          <select
            value={preferences.language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            className="bg-transparent border-none text-white text-[10px] font-medium cursor-pointer hover:bg-white/10 rounded px-1 py-0.5 outline-none"
            title="Select Language"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code} className="bg-[#1E1E1E] text-white">
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>

        {/* Backup & Restore */}
        <button
          onClick={() => setShowBackupRestore(true)}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
          title={`${t('statusBar.backupRestore')} | ${t('statusBar.lastBackup')}: ${formatLastBackup(lastBackup)}`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">{t('statusBar.backup')}</span>
          {/* ISSUE 3 FIX: Show last backup date visible near icon */}
          {lastBackup && (
            <span className="text-[9px] text-gray-400 ml-1">
              {formatLastBackup(lastBackup)}
            </span>
          )}
        </button>
      </div>

      {/* Right section - Update status */}
      <div className="flex items-center gap-3">
        {/* Calculator */}
        <div className="relative" ref={calculatorRef}>
          <button
            onClick={() => {
              if (onToggleCalculator) {
                onToggleCalculator()
              } else {
                setInternalShowCalculator(!internalShowCalculator)
              }
            }}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            title={t('statusBar.calculator')}
          >
            <Calculator className="w-3.5 h-3.5" />
          </button>

          {/* Calculator Popup */}
          {showCalculator && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 text-gray-900">
              <div className="p-4">
                {/* Display */}
                <div className="bg-gray-100 rounded px-3 py-4 mb-3 text-right">
                  <div className="text-xs text-gray-500 h-4">
                    {calcOperation && calcPrevValue !== null ? `${calcPrevValue} ${calcOperation}` : ''}
                  </div>
                  <input
                    ref={calcInputRef}
                    type="text"
                    inputMode="numeric"
                    value={calcDisplay}
                    onChange={(e) => {
                      const value = e.target.value
                      // Allow only numbers, decimal point, and basic operators
                      if (/^[0-9.+\-*/]*$/.test(value)) {
                        setCalcDisplay(value)
                        setCalcNewNumber(false)
                      }
                    }}
                    onKeyDown={(e) => {
                      // Handle Enter key
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCalcEquals()
                      }
                      // Handle Escape key
                      else if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCalcClear()
                      }
                      // Handle operators
                      else if (['+', '-', '*', '/'].includes(e.key)) {
                        e.preventDefault()
                        if (calcDisplay) {
                          handleCalcOperation(e.key)
                        }
                      }
                    }}
                    placeholder="0"
                    className="w-full text-2xl font-semibold break-all bg-transparent border-none outline-none text-right placeholder-gray-400"
                  />
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={handleCalcClear}
                    className="col-span-2 bg-red-500 hover:bg-red-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    C
                  </button>
                  <button
                    onClick={() => setCalcDisplay(calcDisplay.slice(0, -1))}
                    className="bg-gray-200 hover:bg-gray-300 rounded py-3 font-semibold transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleCalcOperation('/')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    ÷
                  </button>

                  {['7', '8', '9'].map(num => (
                    <button
                      key={num}
                      onClick={() => handleCalcNumber(num)}
                      className="bg-gray-100 hover:bg-gray-200 rounded py-3 font-semibold transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCalcOperation('*')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    ×
                  </button>

                  {['4', '5', '6'].map(num => (
                    <button
                      key={num}
                      onClick={() => handleCalcNumber(num)}
                      className="bg-gray-100 hover:bg-gray-200 rounded py-3 font-semibold transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCalcOperation('-')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    −
                  </button>

                  {['1', '2', '3'].map(num => (
                    <button
                      key={num}
                      onClick={() => handleCalcNumber(num)}
                      className="bg-gray-100 hover:bg-gray-200 rounded py-3 font-semibold transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleCalcOperation('+')}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    +
                  </button>

                  <button
                    onClick={() => handleCalcNumber('0')}
                    className="col-span-2 bg-gray-100 hover:bg-gray-200 rounded py-3 font-semibold transition-colors"
                  >
                    0
                  </button>
                  <button
                    onClick={handleCalcDecimal}
                    className="bg-gray-100 hover:bg-gray-200 rounded py-3 font-semibold transition-colors"
                  >
                    .
                  </button>
                  <button
                    onClick={handleCalcEquals}
                    className="bg-green-500 hover:bg-green-600 text-white rounded py-3 font-semibold transition-colors"
                  >
                    =
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Keyboard Shortcuts Toggle */}
        {onToggleRightSidebar && (
          <button
            onClick={onToggleRightSidebar}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            title={t('statusBar.keyboardShortcuts')}
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Date/Time Display */}
        <div className="relative" ref={calendarRef}>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            title={t('statusBar.clickToOpenCalendar')}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium">
              {formatCurrentDateTime()}
            </span>
          </button>

          {/* Calendar Popup */}
          {showCalendar && (
            <div className="absolute right-0 bottom-full mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50 text-gray-900">
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm font-semibold">
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the first day of the month */}
                  {Array.from({ length: getFirstDayOfMonth(calendarDate) }, (_, i) => (
                    <div key={`empty-${i}`} className="h-8" />
                  ))}

                  {/* Days of the month */}
                  {Array.from({ length: getDaysInMonth(calendarDate) }, (_, i) => {
                    const day = i + 1
                    const isToday = 
                      day === new Date().getDate() && 
                      calendarDate.getMonth() === new Date().getMonth() && 
                      calendarDate.getFullYear() === new Date().getFullYear()
                    
                    return (
                      <button
                        key={day}
                        onClick={goToToday}
                        className={`h-8 w-8 text-xs rounded hover:bg-blue-100 transition-colors flex items-center justify-center ${
                          isToday ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Today button */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button
                    onClick={goToToday}
                    className="w-full py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors font-medium"
                  >
                    Go to Today
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleNotificationClick}
            className="relative flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
            title={`${unreadCount} ${t(unreadCount === 1 ? 'statusBar.unreadNotification' : 'statusBar.unreadNotifications')}`}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {showNotifications && (
            <div className="absolute right-0 bottom-full mb-2 w-80 max-h-96 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t('statusBar.markAllAsRead')}
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatNotificationTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Check for updates button */}
        <button
          onClick={handleCheckForUpdates}
          disabled={isCheckingManually || updateStatus.checking || updateStatus.downloading}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={t('statusBar.checkForUpdates')}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(isCheckingManually || updateStatus.checking) ? 'animate-spin' : ''}`} />
          <span className="text-[10px]">{t('statusBar.checkForUpdates')}</span>
        </button>

        {/* Last update check */}
        {lastUpdateCheck && (
          <div className="flex items-center gap-1.5 opacity-75 text-[10px]">
            <span>{t('statusBar.lastChecked')} {formatDateTime(lastUpdateCheck)}</span>
          </div>
        )}

        {/* Download progress bar */}
        {updateStatus.downloading && updateStatus.progress !== undefined && (
          <div className="flex items-center gap-2">
            <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${updateStatus.progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium min-w-10">
              {updateStatus.progress.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Update status message */}
        {(updateStatus.message || updateStatus.available || availableVersion) && (
          <div className="flex items-center gap-1.5">
            {getUpdateIcon()}
            <span className={updateStatus.error ? 'text-red-200' : ''}>
              {updateStatus.message || 
               (updateStatus.available && !updateStatus.downloading && !updateStatus.downloaded 
                 ? `${t('statusBar.updateAvailable')}${availableVersion}` 
                 : '')}
            </span>
          </div>
        )}

        {/* App version */}
        <div className="opacity-75 text-[10px]">
          v{appVersion}
        </div>
      </div>

      {/* Backup & Restore Modal */}
      <BackupRestoreModal 
        open={showBackupRestore} 
        onOpenChange={setShowBackupRestore}
        onBackupCreated={handleBackupCreated}
      />
    </div>
  )
}
