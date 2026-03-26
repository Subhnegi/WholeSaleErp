import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { 
  CreditCard, 
  ArrowLeft, 
  CheckCircle, 
  Shield,
  Smartphone,
  Building2,
  AlertCircle,
  Check
} from 'lucide-react'
import { LICENSE_PLANS } from '@/config/api'
import { processPaymentAndRenew } from '@/services/payment'
import type { LicensePlanOption } from '@/types'

type PaymentMethod = 'card' | 'upi' | 'netbanking'

export function PaymentPage() {
  const navigate = useNavigate()
  const { license, refreshLicense } = useAuth()

  const [selectedPlan, setSelectedPlan] = useState<LicensePlanOption | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [error, setError] = useState('')

  // Card form state
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [cardName, setCardName] = useState('')

  // UPI form state
  const [upiId, setUpiId] = useState('')

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    return parts.length ? parts.join(' ') : value
  }

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  // Format duration in days to readable string
  const formatDuration = (days: number): string => {
    if (days === -1) return 'Lifetime'
    if (days === 30) return '1 Month'
    if (days === 90) return '3 Months'
    if (days === 365) return '1 Year'
    return `${days} days`
  }

  const validateForm = (): boolean => {
    if (!selectedPlan) {
      setError('Please select a plan')
      return false
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        setError('Please enter a valid card number')
        return false
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setError('Please enter a valid expiry date')
        return false
      }
      if (!cardCvv || cardCvv.length < 3) {
        setError('Please enter a valid CVV')
        return false
      }
      if (!cardName.trim()) {
        setError('Please enter the cardholder name')
        return false
      }
    }

    if (paymentMethod === 'upi') {
      if (!upiId || !upiId.includes('@')) {
        setError('Please enter a valid UPI ID')
        return false
      }
    }

    setError('')
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || !selectedPlan || !license) return

    setIsProcessing(true)
    setError('')
    setProcessingStep('Processing payment...')

    try {
      // Process payment and renew license in one call
      const result = await processPaymentAndRenew({
        licenseKey: license.licenseKey,
        plan: selectedPlan.id,
        amount: selectedPlan.price,
        paymentMethod,
      })

      if (result.success && result.data) {
        setProcessingStep('Payment successful! Updating license...')
        setTransactionId(result.data.transactionId)
        
        // Short delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Refresh license info from backend
        await refreshLicense()
        
        setIsSuccess(true)
      } else {
        setError(result.error || 'Payment failed. Please try again.')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsProcessing(false)
      setProcessingStep('')
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lineaer-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="max-w-md w-full border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
            <p className="text-slate-400 mb-4">
              Your license has been renewed successfully. Thank you for your payment.
            </p>
            
            {/* Transaction Details */}
            <div className="bg-slate-700/30 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Transaction ID</span>
                <span className="text-white font-mono text-xs">{transactionId}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Plan</span>
                <span className="text-white">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Paid</span>
                <span className="text-green-400 font-medium">₹{selectedPlan?.price}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/license')}
                className="w-full bg-primary hover:bg-primary/90"
              >
                View License Details
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/license')}
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-lineaer-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/license')}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Renew License</h1>
            <p className="text-slate-400 text-sm">Select a plan and complete payment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Plan Selection & Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Plan Selection */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Select Plan</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose a plan that works best for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {LICENSE_PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlan(plan)
                        setError('')
                      }}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'border-primary bg-primary/10'
                          : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{plan.name}</p>
                          <p className="text-sm text-slate-400">{formatDuration(plan.duration)}</p>
                        </div>
                        {selectedPlan?.id === plan.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-primary mt-2">₹{plan.price}</p>
                      {plan.savings && (
                        <Badge variant="success" className="mt-2 text-xs">
                          {plan.savings}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Payment Method</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose how you want to pay
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={() => {
                      setPaymentMethod('card')
                      setError('')
                    }}
                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    Card
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('upi')
                      setError('')
                    }}
                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'upi'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    UPI
                  </button>
                  <button
                    onClick={() => {
                      setPaymentMethod('netbanking')
                      setError('')
                    }}
                    className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'netbanking'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                    Netbanking
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Error Alert */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Card Payment Form */}
                  {paymentMethod === 'card' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber" className="text-slate-200">
                          Card Number
                        </Label>
                        <Input
                          id="cardNumber"
                          placeholder="1234 5678 9012 3456"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          maxLength={19}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                          disabled={isProcessing}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry" className="text-slate-200">
                            Expiry Date
                          </Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                            maxLength={5}
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                            disabled={isProcessing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv" className="text-slate-200">
                            CVV
                          </Label>
                          <Input
                            id="cvv"
                            type="password"
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                            maxLength={4}
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                            disabled={isProcessing}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardName" className="text-slate-200">
                          Cardholder Name
                        </Label>
                        <Input
                          id="cardName"
                          placeholder="JOHN DOE"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                          disabled={isProcessing}
                        />
                      </div>
                    </div>
                  )}

                  {/* UPI Payment Form */}
                  {paymentMethod === 'upi' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="upiId" className="text-slate-200">
                          UPI ID
                        </Label>
                        <Input
                          id="upiId"
                          placeholder="yourname@upi"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                          disabled={isProcessing}
                        />
                      </div>
                      <p className="text-sm text-slate-400">
                        Enter your UPI ID to receive a payment request
                      </p>
                    </div>
                  )}

                  {/* Netbanking Message */}
                  {paymentMethod === 'netbanking' && (
                    <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
                      <p className="text-slate-300">
                        You will be redirected to your bank's secure payment gateway to complete the transaction.
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full mt-6 bg-primary hover:bg-primary/90"
                    size="lg"
                    disabled={isProcessing || !selectedPlan}
                  >
                    {isProcessing ? (
                      <>
                        <Spinner size="sm" />
                        {processingStep || 'Processing...'}
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Pay ₹{selectedPlan?.price || 0}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur sticky top-8">
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current License</span>
                  <span className="text-white font-mono text-xs">
                    {license?.licenseKey?.slice(0, 10)}...
                  </span>
                </div>
                
                {selectedPlan ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Plan</span>
                      <span className="text-white">{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white">{formatDuration(selectedPlan.duration)}</span>
                    </div>
                    {selectedPlan.savings && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Savings</span>
                        <span className="text-green-400">{selectedPlan.savings}</span>
                      </div>
                    )}
                    <hr className="border-slate-700" />
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">Total</span>
                      <span className="text-2xl font-bold text-primary">₹{selectedPlan.price}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    Select a plan to see order summary
                  </div>
                )}

                <div className="pt-4 flex items-center gap-2 text-sm text-slate-400">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Secure payment powered by SSL</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          By completing this purchase, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}
