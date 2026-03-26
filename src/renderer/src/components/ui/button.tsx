import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action - Blue (trust, primary actions)
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        
        // Destructive/Delete - Red (urgent, delete, cancel)
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        
        // Success/Continue - Green (success, go, continue)
        success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
        
        // Warning/Alert - Yellow (alerts, caution)
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm",
        
        // Call-to-Action - Orange (energy, primary CTA)
        cta: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
        
        // Premium/Special - Purple (premium, thoughtful actions)
        premium: "bg-purple-600 text-white hover:bg-purple-700 shadow-sm",
        
        // Outline variants (borders with colored text)
        outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700",
        "outline-blue": "border border-blue-300 bg-white hover:bg-blue-50 text-blue-700",
        "outline-red": "border border-red-300 bg-white hover:bg-red-50 text-red-700",
        "outline-green": "border border-green-300 bg-white hover:bg-green-50 text-green-700",
        "outline-orange": "border border-orange-300 bg-white hover:bg-orange-50 text-orange-700",
        
        // Secondary - Less prominent (Gray/Black)
        secondary: "bg-gray-600 text-white hover:bg-gray-700 shadow-sm",
        
        // Ghost - Minimal style
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        "ghost-red": "text-red-600 hover:bg-red-50 hover:text-red-700",
        "ghost-blue": "text-blue-600 hover:bg-blue-50 hover:text-blue-700",
        "ghost-green": "text-green-600 hover:bg-green-50 hover:text-green-700",
        
        // Link style
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
