import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldX, AlertCircle } from 'lucide-react'

interface LicenseBlockDialogProps {
  open: boolean
  reason: string
  requiresAction?: 'renew' | 'validate' | 'login'
  onRenew?: () => void
  onValidate?: () => void
  onLogin?: () => void
}

export function LicenseBlockDialog({
  open,
  reason,
  requiresAction,
  onRenew,
  onValidate,
  onLogin
}: LicenseBlockDialogProps) {
  const getActionButton = () => {
    switch (requiresAction) {
      case 'renew':
        return (
          <Button onClick={onRenew} className="w-full">
            Renew License
          </Button>
        )
      case 'validate':
        return (
          <Button onClick={onValidate} className="w-full">
            Validate License
          </Button>
        )
      case 'login':
        return (
          <Button onClick={onLogin} className="w-full">
            Login
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-white" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            {requiresAction === 'login' ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <ShieldX className="h-5 w-5" />
            )}
            {requiresAction === 'login' ? 'Login Required' : 'License Required'}
          </DialogTitle>
          <DialogDescription className="pt-2 text-gray-700">
            {reason}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          {getActionButton()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
