import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { createAccount, updateAccount } from '@/store/slices/accountSlice'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { RefreshCw, Globe } from 'lucide-react'
import type { Account } from '@/types/account'
import AccountGroupFormModal from './AccountGroupFormModal'

interface AccountFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account | null
  viewMode?: boolean
  onSuccess?: () => void
  defaultAccountGroupId?: string  // Pre-select and disable account group
}

export function AccountFormModal({ 
  open, 
  onOpenChange, 
  account, 
  viewMode = false,
  onSuccess,
  defaultAccountGroupId
}: AccountFormModalProps) {
  const dispatch = useAppDispatch()
  const { activeCompany } = useAppSelector((state) => state.company)
  const { accountGroups, loading } = useAppSelector((state) => state.account)
  
  const [activeTab, setActiveTab] = useState('basic')
  const [selectedLanguage, setSelectedLanguage] = useState<'hindi' | 'gujarati' | 'marathi' | 'punjabi'>('hindi')
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showAccountGroupModal, setShowAccountGroupModal] = useState(false)
  
  const [formData, setFormData] = useState({
    accountName: '',
    code: '',
    accountGroupId: '',
    openingBalance: 0,
    drCr: 'Dr' as 'Dr' | 'Cr',
    area: '',
    srNo: '',
    crLimit: 0,
    nameLang: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    panNo: '',
    mobile1: '',
    mobile2: '',
    bankName1: '',
    accountNo1: '',
    bankName2: '',
    accountNo2: '',
    contactPerson: '',
    ledgerFolioNo: '',
    auditUpto: '',
    maintainBillByBillBalance: false,
    photo: ''
  })

  const languageOptions = [
    { value: 'hindi', label: 'Hindi (हिन्दी)' },
    { value: 'gujarati', label: 'Gujarati (ગુજરાતી)' },
    { value: 'marathi', label: 'Marathi (मराठी)' },
    { value: 'punjabi', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  ]

  const generateCode = () => {
    if (!formData.accountGroupId) {
      toast.error('Please select an account group first')
      return
    }
    
    const selectedGroup = accountGroups.find(g => g.id === formData.accountGroupId)
    if (!selectedGroup) return

    // Generate code: First 3 letters of group + random 4 digits
    const groupPrefix = selectedGroup.name.substring(0, 3).toUpperCase()
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const generatedCode = `${groupPrefix}${randomNum}`
    
    setFormData(prev => ({ ...prev, code: generatedCode }))
    toast.success('Code generated successfully')
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file')
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photo: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (account) {
      setFormData({
        accountName: account.accountName,
        code: account.code || '',
        accountGroupId: account.accountGroupId,
        openingBalance: account.openingBalance,
        drCr: account.drCr as 'Dr' | 'Cr',
        area: account.area || '',
        srNo: account.srNo || '',
        crLimit: account.crLimit || 0,
        nameLang: account.nameLang || '',
        address: account.address || '',
        address2: account.address2 || '',
        city: account.city || '',
        state: account.state || '',
        panNo: account.panNo || '',
        mobile1: account.mobile1 || '',
        mobile2: account.mobile2 || '',
        bankName1: account.bankName1 || '',
        accountNo1: account.accountNo1 || '',
        bankName2: account.bankName2 || '',
        accountNo2: account.accountNo2 || '',
        contactPerson: account.contactPerson || '',
        ledgerFolioNo: account.ledgerFolioNo || '',
        auditUpto: account.auditUpto || '',
        maintainBillByBillBalance: account.maintainBillByBillBalance,
        photo: account.photo || ''
      })
    } else {
      setFormData({
        accountName: '',
        code: '',
        accountGroupId: defaultAccountGroupId || '',
        openingBalance: 0,
        drCr: 'Dr',
        area: '',
        srNo: '',
        crLimit: 0,
        nameLang: '',
        address: '',
        address2: '',
        city: '',
        state: '',
        panNo: '',
        mobile1: '',
        mobile2: '',
        bankName1: '',
        accountNo1: '',
        bankName2: '',
        accountNo2: '',
        contactPerson: '',
        ledgerFolioNo: '',
        auditUpto: '',
        maintainBillByBillBalance: false,
        photo: ''
      })
    }
  }, [account, defaultAccountGroupId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.accountName || !formData.accountGroupId) {
      toast.error('Please fill in required fields')
      return
    }

    if (!activeCompany) {
      toast.error('No active company selected')
      return
    }

    const dataToSubmit: Partial<Account> = {
      ...formData,
      companyId: activeCompany.id
    }

    try {
      let result
      if (account) {
        result = await dispatch(updateAccount({ id: account.id, data: dataToSubmit }))
      } else {
        result = await dispatch(createAccount(dataToSubmit))
      }

      if ((account && updateAccount.fulfilled.match(result)) || 
          (!account && createAccount.fulfilled.match(result))) {
        toast.success(account ? 'Account updated successfully' : 'Account created successfully')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(account ? 'Failed to update account' : 'Failed to create account')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isEditing = !!account

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'View Account' : isEditing ? 'Edit Account' : 'Create New Account'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Account details' : 'Fill in the account information below'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger 
                value="basic"
                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              >
                Basic Info
              </TabsTrigger>
              <TabsTrigger 
                value="address"
                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              >
                Address & Contact
              </TabsTrigger>
              <TabsTrigger 
                value="bank"
                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              >
                Bank Details
              </TabsTrigger>
              <TabsTrigger 
                value="other"
                className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm"
              >
                Other Details
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Basic Info */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Row 1: Name, Code, Photo */}
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="accountName" className="text-base font-semibold">
                      Name of Account <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) => handleInputChange('accountName', e.target.value)}
                      disabled={viewMode}
                      className="bg-green-50"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="code">Code</Label>
                    <div className="flex gap-1">
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        disabled={viewMode}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        onClick={generateCode}
                        disabled={viewMode}
                        title="Generate Code"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 w-[200px]">
                  <Label>Photo</Label>
                  <div className="border rounded-md h-32 flex items-center justify-center bg-gray-50">
                    {formData.photo ? (
                      <img src={formData.photo} alt="Account" className="h-full w-full object-cover rounded-md" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Photo</span>
                    )}
                  </div>
                  {!viewMode && (
                    <>
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                      <Label 
                        htmlFor="photo-upload" 
                        className="cursor-pointer"
                      >
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          asChild
                        >
                          <span>Select Photo</span>
                        </Button>
                      </Label>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Group, Opening Balance, Dr/Cr */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="accountGroup">
                    Select Group <span className="text-red-500">*</span>
                  </Label>
                  <Combobox
                    options={accountGroups.map((group) => ({
                      value: group.id,
                      label: group.name
                    }))}
                    value={formData.accountGroupId}
                    onChange={(value) => handleInputChange('accountGroupId', value)}
                    placeholder="Select account group"
                    searchPlaceholder="Search groups..."
                    emptyText="No group found."
                    disabled={viewMode || !!defaultAccountGroupId}
                    onCreateNew={defaultAccountGroupId ? undefined : () => setShowAccountGroupModal(true)}
                    createNewLabel="Create new group"
                  />
                </div>
                <div className="grid gap-2 w-40">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    value={formData.openingBalance || ''}
                    onChange={(e) => handleInputChange('openingBalance', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2 w-32">
                  <Label htmlFor="drCr">Dr. / Cr.</Label>
                  <Select
                    value={formData.drCr}
                    onValueChange={(value) => handleInputChange('drCr', value)}
                    disabled={viewMode}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr">Dr</SelectItem>
                      <SelectItem value="Cr">Cr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Area, Sr. No., Cr. Limit */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={formData.area || ''}
                    onChange={(e) => handleInputChange('area', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2 w-40">
                  <Label htmlFor="srNo">Sr. No.</Label>
                  <Input
                    id="srNo"
                    value={formData.srNo || ''}
                    onChange={(e) => handleInputChange('srNo', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2 w-32">
                  <Label htmlFor="crLimit">Cr. Limit</Label>
                  <Input
                    id="crLimit"
                    type="number"
                    step="0.01"
                    value={formData.crLimit || ''}
                    onChange={(e) => handleInputChange('crLimit', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                    disabled={viewMode}
                  />
                </div>
              </div>

              {/* Row 4: Name in Regional Language */}
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="nameLang">
                    Name ({languageOptions.find(l => l.value === selectedLanguage)?.label.split(' ')[0]})
                  </Label>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                      disabled={viewMode}
                      className="h-7 px-2"
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                    {showLanguageMenu && (
                      <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[150px]">
                        {languageOptions.map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                            onClick={() => {
                              setSelectedLanguage(lang.value as any)
                              setShowLanguageMenu(false)
                            }}
                          >
                            {lang.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Input
                  id="nameLang"
                  value={formData.nameLang || ''}
                  onChange={(e) => handleInputChange('nameLang', e.target.value)}
                  disabled={viewMode}
                  placeholder={`Enter name in ${languageOptions.find(l => l.value === selectedLanguage)?.label.split(' ')[0]}`}
                />
              </div>
            </TabsContent>

            {/* Tab 2: Address & Contact */}
            <TabsContent value="address" className="space-y-4 mt-4">
              {/* Address fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address2">Address 2</Label>
                  <Input
                    id="address2"
                    value={formData.address2 || ''}
                    onChange={(e) => handleInputChange('address2', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1fr_auto] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2 w-48">
                  <Label htmlFor="panNo">PAN No.</Label>
                  <Input
                    id="panNo"
                    value={formData.panNo || ''}
                    onChange={(e) => handleInputChange('panNo', e.target.value.toUpperCase())}
                    disabled={viewMode}
                    maxLength={10}
                  />
                </div>
              </div>

              {/* Contact fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="mobile1">Mobile No. 1</Label>
                  <Input
                    id="mobile1"
                    value={formData.mobile1 || ''}
                    onChange={(e) => handleInputChange('mobile1', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile2">Mobile No. 2</Label>
                  <Input
                    id="mobile2"
                    value={formData.mobile2 || ''}
                    onChange={(e) => handleInputChange('mobile2', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson || ''}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  disabled={viewMode}
                />
              </div>
            </TabsContent>

            {/* Tab 3: Bank Details */}
            <TabsContent value="bank" className="space-y-4 mt-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Primary Bank</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bankName1">Bank Name 1</Label>
                    <Input
                      id="bankName1"
                      value={formData.bankName1 || ''}
                      onChange={(e) => handleInputChange('bankName1', e.target.value)}
                      disabled={viewMode}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountNo1">Account No. 1</Label>
                    <Input
                      id="accountNo1"
                      value={formData.accountNo1 || ''}
                      onChange={(e) => handleInputChange('accountNo1', e.target.value)}
                      disabled={viewMode}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Secondary Bank</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bankName2">Bank Name 2</Label>
                    <Input
                      id="bankName2"
                      value={formData.bankName2 || ''}
                      onChange={(e) => handleInputChange('bankName2', e.target.value)}
                      disabled={viewMode}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="accountNo2">Account No. 2</Label>
                    <Input
                      id="accountNo2"
                      value={formData.accountNo2 || ''}
                      onChange={(e) => handleInputChange('accountNo2', e.target.value)}
                      disabled={viewMode}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Other Details */}
            <TabsContent value="other" className="space-y-4 mt-4">
              <div className="grid grid-cols-[1fr_auto_auto] gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ledgerFolioNo">Ledger Folio No.</Label>
                  <Input
                    id="ledgerFolioNo"
                    value={formData.ledgerFolioNo || ''}
                    onChange={(e) => handleInputChange('ledgerFolioNo', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
                <div className="grid gap-2 w-48">
                  <Label htmlFor="auditUpto">Audit Upto</Label>
                  <Input
                    id="auditUpto"
                    type="date"
                    value={formData.auditUpto || ''}
                    onChange={(e) => handleInputChange('auditUpto', e.target.value)}
                    disabled={viewMode}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="maintainBillByBillBalance"
                  checked={formData.maintainBillByBillBalance}
                  onCheckedChange={(checked) => handleInputChange('maintainBillByBillBalance', checked)}
                  disabled={viewMode}
                />
                <Label 
                  htmlFor="maintainBillByBillBalance" 
                  className="text-red-600 font-medium cursor-pointer"
                >
                  Maintain Bill By Bill Balance
                </Label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 flex justify-between items-center">
            <div className="flex gap-2">
              {activeTab !== 'basic' && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={(e) => {
                    e.preventDefault()
                    const tabs = ['basic', 'address', 'bank', 'other']
                    const currentIndex = tabs.indexOf(activeTab)
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1])
                  }}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {activeTab !== 'other' ? (
                <Button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault()
                    const tabs = ['basic', 'address', 'bank', 'other']
                    const currentIndex = tabs.indexOf(activeTab)
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1])
                  }}
                >
                  Next
                </Button>
              ) : (
                !viewMode && (
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                  </Button>
                )
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Account Group Creation Modal */}
      <AccountGroupFormModal
        open={showAccountGroupModal}
        onOpenChange={setShowAccountGroupModal}
        onSuccess={(groupId) => {
          handleInputChange('accountGroupId', groupId)
        }}
      />
    </Dialog>
  )
}
