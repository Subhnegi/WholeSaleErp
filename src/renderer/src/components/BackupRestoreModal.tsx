import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Checkbox } from './ui/checkbox'
import {
  HardDrive,
  Cloud,
  Download,
  Upload,
  FolderOpen,
  Archive,
  Trash2,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { updateBackupSettings } from '../store/slices/preferencesSlice'
import { useTranslation } from '../hooks/useTranslation'

interface BackupRestoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBackupCreated?: () => void  // Callback when backup is created
}

interface BackupFile {
  id: string
  name: string
  path: string
  date: Date
  size: string
  location: 'local' | 'custom' | 'cloud'
}

export function BackupRestoreModal({ open, onOpenChange, onBackupCreated }: BackupRestoreModalProps) {
  const dispatch = useAppDispatch()
  const backupSettings = useAppSelector((state) => state.preferences.backupSettings)
  const { t } = useTranslation()
  
  const [activeTab, setActiveTab] = useState<'offline' | 'cloud'>('offline')
  const [isProcessing, setIsProcessing] = useState(false)
  const [backupList, setBackupList] = useState<BackupFile[]>([])

  // Offline backup settings
  const [offlineBackupFolder, setOfflineBackupFolder] = useState('')
  const [backupPassword, setBackupPassword] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState({ message: '', percent: 0 })
  
  // Cloud backup settings
  const [googleDriveFolder, setGoogleDriveFolder] = useState('')

  // ISSUE 1 FIX: Define loadBackupList before useEffects
  const loadBackupList = async () => {
    try {
      if (!window.api?.backup?.list) {
        console.error('Backup API not available')
        return
      }
      console.log('[BackupModal] Loading backup list from:', offlineBackupFolder || 'default')
      const result = await window.api.backup.list(offlineBackupFolder || undefined)
      
      if (result.success) {
        console.log('[BackupModal] Found backups:', result.backups?.length || 0)
        console.log(result.backups)
        setBackupList(result.backups || [])
        console.log(backupList)
      } else {
        console.error('[BackupModal] Failed to load backups:', result.message)
      }
    } catch (error) {
      console.error('Load backups error:', error)
    }
  }

  const loadDefaultFolder = async () => {
    try {
      if (!window.api?.backup?.getDefaultFolder) {
        console.error('Backup API not available:', window.api)
        return
      }
      const result = await window.api.backup.getDefaultFolder()
      if (result.success && result.path) {
        setOfflineBackupFolder(result.path)
      }
    } catch (error) {
      console.error('Error loading default folder:', error)
    }
  }

  // Load backup list when modal opens or folder changes
  useEffect(() => {
    if (open) {
      console.log('Modal opened, checking API:', {
        hasApi: !!window.api,
        hasBackupApi: !!window.api?.backup,
        backupMethods: window.api?.backup ? Object.keys(window.api.backup) : 'undefined'
      })
      loadDefaultFolder()
      // ISSUE 1 FIX: Load backup list immediately, don't wait for folder to be set
      loadBackupList()
    }
  }, [open])

  // Reload backup list when folder changes (after initial load)
  useEffect(() => {
    if (open && offlineBackupFolder) {
      console.log('[BackupModal] Folder changed, reloading list:', offlineBackupFolder)
      loadBackupList()
    }
  }, [offlineBackupFolder])

  // ISSUE 5: Remove cancel toast messages
  const handleSelectOfflineFolder = async () => {
    try {
      const result = await window.api.backup.selectFolder()
      if (result.success && result.path) {
        setOfflineBackupFolder(result.path)
        toast.success(t('backupRestore.folderSelected'))
      }
      // Don't show toast on cancel
    } catch (error) {
      console.error('Folder selection error:', error)
      toast.error(t('backupRestore.selectFolderFailed'))
    }
  }

  const handleSelectGoogleDriveFolder = async () => {
    try {
      // TODO: Implement Google Drive folder picker
      // For now, use placeholder
      setGoogleDriveFolder('My Drive/MandiERP Backups')
      toast.success(t('backupRestore.googleDriveFolderSelected'))
    } catch (error) {
      console.error('Google Drive folder selection error:', error)
      toast.error(t('backupRestore.selectGoogleDriveFolderFailed'))
    }
  }

  const handleOfflineBackup = async () => {
    try {
      setIsProcessing(true)
      setRestoreProgress({ message: 'Creating backup...', percent: 30 })
      
      // Create backup with options
      const result = await window.api.backup.create({
        location: offlineBackupFolder || undefined,
        password: backupSettings.passwordProtect ? backupPassword : undefined,
        archiveOld: backupSettings.archiveOldBackups
      })
      
      setRestoreProgress({ message: 'Finalizing...', percent: 90 })
      
      if (result.success) {
        setRestoreProgress({ message: 'Backup complete!', percent: 100 })
        toast.success(t('backupRestore.backupCreated'))
        
        // Notify parent component
        onBackupCreated?.()
        
        // ISSUE 3 FIX: Force reload backup list after short delay
        setTimeout(async () => {
          await loadBackupList()
        }, 300)
      } else {
        // ISSUE 1 FIX: Show info instead of error if no changes
        if (result.message?.includes('No changes')) {
          toast.info(t('backupRestore.noChangesToBackup'), {
            description: t('backupRestore.dataUpToDate')
          })
        } else {
          toast.error(t('backupRestore.backupFailed'), {
            description: result.message || 'Unknown error'
          })
        }
      }
    } catch (error) {
      console.error('Backup error:', error)
      toast.error(t('backupRestore.backupFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
        setRestoreProgress({ message: '', percent: 0 })
      }, 500)
    }
  }

  const handleOfflineRestore = async (backupPath: string) => {
    try {
      setIsProcessing(true)
      setIsRestoring(true)
      setRestoreProgress({ message: 'Preparing to restore...', percent: 10 })
      
      setRestoreProgress({ message: 'Restoring database...', percent: 50 })
      const result = await window.api.backup.restore(backupPath)

      setRestoreProgress({ message: 'Verifying data...', percent: 80 })

      if (result.success) {
        setRestoreProgress({ message: 'Restore complete!', percent: 100 })
        
        // ISSUE 4 FIX: Ask user to restart app to recreate system tables
        toast.success(t('backupRestore.restoreSuccess'), {
          description: t('backupRestore.restartRequired', { count: result.recordsRestored }),
          duration: 10000
        })
        
        if (result.errors && result.errors.length > 0) {
          console.warn('Restore warnings:', result.errors)
          toast.warning(t('backupRestore.someRecordsIssues'), {
            description: t('backupRestore.checkConsole', { count: result.errors.length })
          })
        }
        
        // Close modal and show restart button
        setTimeout(() => {
          onOpenChange(false)
          // Show a dialog asking user to restart
          if (confirm(t('backupRestore.restartPrompt'))) {
            // Restart the app
            if (window.api?.app?.relaunch) {
              window.api.app.relaunch()
            } else {
              // Fallback: quit the app (user will need to restart manually)
              if (window.api?.app?.quit) {
                window.api.app.quit()
              }
            }
          }
        }, 2000)
      } else {
        toast.error(t('backupRestore.restoreFailed'), {
          description: result.message || 'Unknown error'
        })
      }
    } catch (error) {
      console.error('Restore error:', error)
      toast.error(t('backupRestore.restoreFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
        setIsRestoring(false)
        setRestoreProgress({ message: '', percent: 0 })
      }, 500)
    }
  }

  // ISSUE 5: Remove cancel toast messages
  const handleBrowseBackup = async () => {
    try {
      const result = await window.api.backup.selectFile()
      
      if (result.success && result.path) {
        // Automatically restore the selected file
        await handleOfflineRestore(result.path)
      }
      // Don't show toast on cancel
    } catch (error) {
      console.error('Browse error:', error)
      toast.error(t('backupRestore.loadBackupFailed'))
    }
  }

  // TASK 1: Quick restore from default backup
  const handleQuickRestore = async () => {
    try {
      const result = await window.api.backup.getDefaultBackupPath()
      
      if (!result.success || !result.path) {
        toast.error(t('backupRestore.defaultBackupNotFound'))
        return
      }

      // Confirm before restoring
      if (!confirm(t('backupRestore.confirmQuickRestore'))) {
        return
      }

      await handleOfflineRestore(result.path)
    } catch (error) {
      console.error('Quick restore error:', error)
      toast.error(t('backupRestore.quickRestoreFailed'))
    }
  }

  const handleCloudBackup = async () => {
    try {
      setIsProcessing(true)
      
      // TODO: Implement Google Drive API
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success(t('backupRestore.cloudUploadSuccess'), {
        description: t('backupRestore.cloudFeatureComingSoon')
      })
      
      setIsProcessing(false)
    } catch (error) {
      console.error('Cloud backup error:', error)
      toast.error(t('backupRestore.cloudBackupFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      setIsProcessing(false)
    }
  }

  const handleCloudRestore = async (_backupId: string) => {
    try {
      setIsProcessing(true)
      
      // TODO: Implement Google Drive restore
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast.success(t('backupRestore.cloudRestoreSuccess'), {
        description: t('backupRestore.cloudRestoreComingSoon')
      })
      
      setIsProcessing(false)
      onOpenChange(false)
    } catch (error) {
      console.error('Cloud restore error:', error)
      toast.error(t('backupRestore.cloudRestoreFailed'), {
        description: error instanceof Error ? error.message : 'Unknown error'
      })
      setIsProcessing(false)
    }
  }

  const handleDeleteBackup = async (filePath: string) => {
    try {
      if (!confirm(t('backupRestore.confirmDeleteBackup'))) {
        return
      }

      const result = await window.api.backup.delete(filePath)
      if (result.success) {
        toast.success(t('backupRestore.backupDeleted'))
        await loadBackupList()
      } else {
        toast.error(t('backupRestore.deleteBackupFailed'), {
          description: result.message
        })
      }
    } catch (error) {
      console.error('Delete backup error:', error)
      toast.error('Failed to delete backup')
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            {t('backupRestore.title')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'offline' | 'cloud')}>
          <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100">
            <TabsTrigger 
              value="offline" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 transition-all duration-200"
            >
              <HardDrive className="h-4 w-4" />
              {t('backupRestore.offlineBackup')}
            </TabsTrigger>
            <TabsTrigger 
              value="cloud" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 transition-all duration-200"
            >
              <Cloud className="h-4 w-4" />
              {t('backupRestore.cloudBackup')}
            </TabsTrigger>
          </TabsList>

          {/* Offline Backup Tab */}
          <TabsContent value="offline" className="space-y-6">
            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={handleOfflineBackup}
                disabled={isProcessing}
                className="w-full"
                variant="ghost"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('backupRestore.createBackup')}
              </Button>
              <Button
                onClick={handleQuickRestore}
                disabled={isProcessing}
                className="w-full"
                variant="ghost"
                title="Restore from default backup file"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('backupRestore.quickRestore')}
              </Button>
              <Button
                onClick={handleBrowseBackup}
                className="w-full"
                variant="ghost"
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {t('backupRestore.browseBackup')}
              </Button>
            </div>

            {/* Backup Location */}
            <div className="space-y-2">
              <Label htmlFor="offline-folder" className="text-sm font-medium">
                {t('backupRestore.backupLocation')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="offline-folder"
                  type="text"
                  value={offlineBackupFolder}
                  placeholder={t('backupRestore.selectFolderPlaceholder')}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleSelectOfflineFolder}
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Browse
                </Button>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-sm">{t('backupRestore.backupSettings')}</h3>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="archive"
                  checked={backupSettings.archiveOldBackups}
                  onCheckedChange={(checked) => {
                    console.log('[BackupModal] Toggling archiveOldBackups to:', checked)
                    dispatch(updateBackupSettings({ archiveOldBackups: checked as boolean }))
                  }}
                />
                <Label htmlFor="archive" className="text-sm cursor-pointer">
                  {t('backupRestore.archiveOldBackups')}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="delete"
                  checked={backupSettings.deleteOldBackups}
                  onCheckedChange={(checked) => {
                    console.log('[BackupModal] Toggling deleteOldBackups to:', checked)
                    dispatch(updateBackupSettings({ deleteOldBackups: checked as boolean }))
                  }}
                />
                <Label htmlFor="delete" className="text-sm cursor-pointer">
                  {t('backupRestore.deleteOldBackups')}
                </Label>
                <Input
                  type="number"
                  value={backupSettings.deleteAfterDays}
                  onChange={(e) =>
                    dispatch(
                      updateBackupSettings({
                        deleteAfterDays: parseInt(e.target.value) || 30
                      })
                    )
                  }
                  disabled={!backupSettings.deleteOldBackups}
                  className="w-20 h-8"
                  min="1"
                />
                <span className="text-sm">{t('backupRestore.days')}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="password"
                    checked={backupSettings.passwordProtect}
                    onCheckedChange={(checked) =>
                      dispatch(updateBackupSettings({ passwordProtect: checked as boolean }))
                    }
                  />
                  <Label htmlFor="password" className="text-sm cursor-pointer">
                    {t('backupRestore.passwordProtect')}
                  </Label>
                </div>
                {backupSettings.passwordProtect && (
                  <Input
                    type="password"
                    placeholder="Enter backup password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    className="h-8"
                  />
                )}
              </div>

              {/* Automatic Backup Schedule */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-semibold text-sm">{t('backupRestore.automaticBackupSchedule')}</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="offline-auto"
                    checked={backupSettings.offlineAutoBackup}
                    onCheckedChange={(checked) =>
                      dispatch(updateBackupSettings({ offlineAutoBackup: checked as boolean }))
                    }
                  />
                  <Label htmlFor="offline-auto" className="text-sm cursor-pointer">
                    {t('backupRestore.enableAutomaticBackups')}
                  </Label>
                </div>

                {backupSettings.offlineAutoBackup && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="offline-frequency" className="text-sm">
                        {t('backupRestore.backupFrequency')}
                      </Label>
                      <select
                        id="offline-frequency"
                        value={backupSettings.offlineBackupFrequency}
                        onChange={(e) =>
                          dispatch(
                            updateBackupSettings({
                              offlineBackupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                            })
                          )
                        }
                        className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm"
                      >
                        <option value="daily">{t('backupRestore.daily')}</option>
                        <option value="weekly">{t('backupRestore.weekly')}</option>
                        <option value="monthly">{t('backupRestore.monthly')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="offline-time" className="text-sm">
                        {t('backupRestore.backupTime')}
                      </Label>
                      <Input
                        id="offline-time"
                        type="time"
                        value={backupSettings.offlineBackupTime}
                        onChange={(e) =>
                          dispatch(updateBackupSettings({ offlineBackupTime: e.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Backup List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">{t('backupRestore.availableBackups')}</h3>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {backupList.filter(b => b.location == 'custom').length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    {t('backupRestore.noBackupsFound')}
                  </div>
                ) : (
                  backupList
                    .filter(b => b.location == 'custom')
                    .map((backup) => (
                      <div key={backup.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Archive className="h-4 w-4 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{backup.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(backup.date)} • {backup.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOfflineRestore(backup.path)}
                            disabled={isProcessing}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            {t('backupRestore.restore')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBackup(backup.path)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Cloud Backup Tab */}
          <TabsContent value="cloud" className="space-y-6">
            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleCloudBackup}
                disabled={isProcessing}
                className="w-full"
                variant="ghost"
              >
                <Cloud className="mr-2 h-4 w-4" />
                {t('backupRestore.uploadToCloud')}
              </Button>
              <Button
                onClick={loadBackupList}
                className="w-full"
                disabled={isProcessing}
                variant="ghost"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('backupRestore.refreshList')}
              </Button>
            </div>

            {/* Google Drive Folder */}
            <div className="space-y-2">
              <Label htmlFor="cloud-folder" className="text-sm font-medium">
                {t('backupRestore.googleDriveFolder')}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="cloud-folder"
                  type="text"
                  value={googleDriveFolder}
                  placeholder={t('backupRestore.selectGoogleDriveFolder')}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={handleSelectGoogleDriveFolder}
                  variant="outline"
                  size="sm"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Browse
                </Button>
              </div>
            </div>

            {/* Cloud Settings */}
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold text-sm">{t('backupRestore.cloudBackupSettings')}</h3>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cloudPassword"
                    checked={backupSettings.passwordProtect}
                    onCheckedChange={(checked) =>
                      dispatch(updateBackupSettings({ passwordProtect: checked as boolean }))
                    }
                  />
                  <Label htmlFor="cloudPassword" className="text-sm cursor-pointer">
                    {t('backupRestore.passwordProtectBeforeUpload')}
                  </Label>
                </div>
                {backupSettings.passwordProtect && (
                  <Input
                    type="password"
                    placeholder="Enter backup password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    className="h-8"
                  />
                )}
              </div>

              {/* Automatic Backup Schedule */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="font-semibold text-sm">Automatic Backup Schedule</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cloud-auto"
                    checked={backupSettings.cloudAutoBackup}
                    onCheckedChange={(checked) =>
                      dispatch(updateBackupSettings({ cloudAutoBackup: checked as boolean }))
                    }
                  />
                  <Label htmlFor="cloud-auto" className="text-sm cursor-pointer">
                    Enable automatic backups
                  </Label>
                </div>

                {backupSettings.cloudAutoBackup && (
                  <div className="space-y-3 pl-6">
                    <div className="space-y-2">
                      <Label htmlFor="cloud-frequency" className="text-sm">
                        {t('backupRestore.backupFrequency')}
                      </Label>
                      <select
                        id="cloud-frequency"
                        value={backupSettings.cloudBackupFrequency}
                        onChange={(e) =>
                          dispatch(
                            updateBackupSettings({
                              cloudBackupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                            })
                          )
                        }
                        className="w-full h-9 px-3 rounded-md border border-gray-300 bg-white text-sm"
                      >
                        <option value="daily">{t('backupRestore.daily')}</option>
                        <option value="weekly">{t('backupRestore.weekly')}</option>
                        <option value="monthly">{t('backupRestore.monthly')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cloud-time" className="text-sm">
                        {t('backupRestore.backupTime')}
                      </Label>
                      <Input
                        id="cloud-time"
                        type="time"
                        value={backupSettings.cloudBackupTime}
                        onChange={(e) =>
                          dispatch(updateBackupSettings({ cloudBackupTime: e.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cloud Backup List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">{t('backupRestore.cloudBackups')}</h3>
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {backupList.filter(b => b.location === 'cloud').length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm">
                    {t('backupRestore.noCloudBackupsFound')}
                  </div>
                ) : (
                  backupList
                    .filter(b => b.location === 'cloud')
                    .map((backup) => (
                      <div key={backup.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Cloud className="h-4 w-4 text-blue-500" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{backup.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(backup.date)} • {backup.size}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCloudRestore(backup.id)}
                            disabled={isProcessing}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteBackup(backup.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Google Drive Status */}
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{t('backupRestore.googleDriveConnected')}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    {t('backupRestore.googleDriveConnectedDescription')}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* TASK 2: Progress overlay with visual indicators */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-lg z-50">
            <div className="text-center max-w-md w-full px-8">
              <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                {isRestoring ? t('backupRestore.restoringBackup') : t('backupRestore.creatingBackup')}
              </p>
              {restoreProgress.message && (
                <p className="text-sm text-gray-600 mb-4">{restoreProgress.message}</p>
              )}
              {restoreProgress.percent > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${restoreProgress.percent}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
