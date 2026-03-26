import { useState } from 'react'
import { toast } from 'sonner'
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

const PRINT_NAME_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
]

const COUNTRY_CODES = [
  { code: '+91', name: 'India (+91)' },
  { code: '+1', name: 'USA (+1)' },
  { code: '+44', name: 'UK (+44)' },
  { code: '+971', name: 'UAE (+971)' },
  { code: '+65', name: 'Singapore (+65)' },
]

interface CompanyFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CompanyFormModal({ open, onOpenChange, onSuccess }: CompanyFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    printName: '',
    printNameLang: 'en',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    countryCode: '+91',
    mobile1: '',
    mobile2: '',
    email: '',
    website: '',
    contactPerson: '',
    billTitle: '',
    fyStartDate: '',
    fyEndDate: '',
    fyLabel: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.companyName.trim()) {
      toast.error('Validation Error', {
        description: 'Please enter a company name to continue.'
      })
      return
    }

    if (!formData.fyStartDate || !formData.fyEndDate) {
      toast.error('Validation Error', {
        description: 'Please enter financial year start and end dates.'
      })
      return
    }

    // Validate dates
    const startDate = new Date(formData.fyStartDate)
    const endDate = new Date(formData.fyEndDate)
    
    if (endDate <= startDate) {
      toast.error('Validation Error', {
        description: 'Financial year end date must be after start date.'
      })
      return
    }

    try {
      setLoading(true)

      // Get user data from license manager
      const userData = await window.api.license.getUserData()
      if (!userData || !userData.user) {
        toast.error('Authentication Error', {
          description: 'Your session has expired. Please log in again.'
        })
        setLoading(false)
        return
      }
      
      // Auto-generate label if not provided
      const label = formData.fyLabel || `FY ${startDate.getFullYear()}-${endDate.getFullYear()}`
      
      // Create company with embedded financial year
      const response = await window.api.company.create({
        ...formData,
        userId: userData.user.id,
        fyLabel: label,
      })

      if (!response.success) {
        const errorMessage = response.message || 'Failed to create company'
        toast.error('Error', {
          description: errorMessage.includes('duplicate') 
            ? 'A company with this name already exists.' 
            : errorMessage,
          duration: 4000,
        })
        setLoading(false)
        return
      }

      // Success!
      toast.success('Company Created!', {
        description: `${formData.companyName} has been created successfully.`,
        duration: 3000,
      })
      
      // Reset form
      setFormData({
        companyName: '',
        printName: '',
        printNameLang: 'en',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        countryCode: '+91',
        mobile1: '',
        mobile2: '',
        email: '',
        website: '',
        contactPerson: '',
        billTitle: '',
        fyStartDate: '',
        fyEndDate: '',
        fyLabel: '',
      })
      
      // Close modal
      onOpenChange(false)
      
      // Call success callback to refresh list
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      console.error('Company creation error:', err)
      toast.error('Something Went Wrong', {
        description: 'Unable to create company. Please try again.',
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold">Create New Company</DialogTitle>
          <DialogDescription className="text-base">
            Fill in the company details and financial year below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Basic Information</h3>
            <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded-md">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="companyName" className="text-sm font-medium">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="printName" className="text-sm font-medium">Print Name</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Input
                      id="printName"
                      value={formData.printName}
                      onChange={(e) => handleChange('printName', e.target.value)}
                      placeholder="Name for printing on invoices"
                    />
                  </div>
                  <div>
                    <Select
                      value={formData.printNameLang}
                      onValueChange={(value) => handleChange('printNameLang', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Language" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINT_NAME_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="billTitle" className="text-sm font-medium">Marka / Bill Title</Label>
                <Input
                  id="billTitle"
                  value={formData.billTitle}
                  onChange={(e) => handleChange('billTitle', e.target.value)}
                  placeholder="Invoice/Bill header title"
                />
              </div>
            </div>
          </div>

          {/* Financial Year Information */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-base font-bold text-blue-900 uppercase tracking-wide">Financial Year</h3>
            <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded-md">
              <div className="space-y-2">
                <Label htmlFor="fyStartDate" className="text-sm font-medium">Start Date *</Label>
                <Input
                  id="fyStartDate"
                  type="date"
                  value={formData.fyStartDate}
                  onChange={(e) => handleChange('fyStartDate', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fyEndDate" className="text-sm font-medium">End Date *</Label>
                <Input
                  id="fyEndDate"
                  type="date"
                  value={formData.fyEndDate}
                  onChange={(e) => handleChange('fyEndDate', e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="fyLabel" className="text-sm font-medium">Label (Optional)</Label>
                <Input
                  id="fyLabel"
                  type="text"
                  value={formData.fyLabel}
                  onChange={(e) => handleChange('fyLabel', e.target.value)}
                  placeholder="e.g., FY 2024-2025 (auto-generated if left blank)"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to auto-generate from dates
                </p>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Address</h3>
            <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded-md">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addressLine1" className="text-sm font-medium">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="addressLine2" className="text-sm font-medium">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  placeholder="Apartment, suite, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="State"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Contact Information</h3>
            <div className="grid grid-cols-2 gap-6 bg-white p-4 rounded-md">
              <div className="space-y-2">
                <Label htmlFor="countryCode" className="text-sm font-medium">Country Code</Label>
                <Select
                  value={formData.countryCode}
                  onValueChange={(value) => handleChange('countryCode', value)}
                >
                  <SelectTrigger id="countryCode">
                    <SelectValue placeholder="Select country code" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile1" className="text-sm font-medium">Mobile 1</Label>
                <Input
                  id="mobile1"
                  type="tel"
                  value={formData.mobile1}
                  onChange={(e) => handleChange('mobile1', e.target.value)}
                  placeholder="Primary mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile2" className="text-sm font-medium">Mobile 2</Label>
                <Input
                  id="mobile2"
                  type="tel"
                  value={formData.mobile2}
                  onChange={(e) => handleChange('mobile2', e.target.value)}
                  placeholder="Secondary mobile number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="company@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="contactPerson" className="text-sm font-medium">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  placeholder="Primary contact person name"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
