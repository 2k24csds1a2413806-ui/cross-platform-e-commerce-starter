"use client"

import React, { useEffect, useMemo, useState } from "react"
import { ShoppingCart as ShoppingCartIcon, ShoppingBag, CircleCheckBig, CircleChevronLeft, WalletMinimal, PackageCheck, TicketMinus, History } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"

type Currency = "USD" | "EUR" | "GBP"

type CartItem = {
  id: string
  name: string
  price: number
  image: string
  quantity: number
  stock: number
  subtitle?: string
}

type Address = {
  id: string
  label: string
  fullName: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
  phone?: string
  isDefault?: boolean
  email?: string
}

type ShippingMethod = {
  id: string
  label: string
  description?: string
  eta?: string
  cost: number
}

type PaymentMethod = {
  id: string
  label: string
  description?: string
}

type Coupon = {
  code: string
  type: "percent" | "fixed" | "shipping"
  value?: number
}

type CheckoutStep = "cart" | "details" | "shipping" | "payment" | "review" | "success"

export interface ShoppingCartProps {
  className?: string
  style?: React.CSSProperties
  initialItems?: CartItem[]
  savedAddresses?: Address[]
  shippingOptions?: ShippingMethod[]
  paymentMethods?: PaymentMethod[]
  allowGuestCheckout?: boolean
  currency?: Currency
  taxRate?: number
  onOrderComplete?: (order: {
    id: string
    items: CartItem[]
    subtotal: number
    discount: number
    shipping: number
    tax: number
    total: number
    address: Address
    shippingMethod: ShippingMethod
    paymentMethod: PaymentMethod
    email?: string
    note?: string
    coupon?: string
  }) => void
}

const DEFAULT_SHIPPING: ShippingMethod[] = [
  { id: "standard", label: "Standard", description: "3-5 business days", eta: "Arrives in 3-5 days", cost: 6.0 },
  { id: "express", label: "Express", description: "1-2 business days", eta: "Arrives in 1-2 days", cost: 18.0 },
  { id: "pickup", label: "Store Pickup", description: "Ready today", eta: "Pickup today", cost: 0 },
]

const DEFAULT_PAYMENT: PaymentMethod[] = [
  { id: "card", label: "Credit/Debit Card", description: "Visa, Mastercard, Amex" },
  { id: "wallet", label: "Wallet", description: "Apple Pay / Google Pay" },
  { id: "cod", label: "Cash on Delivery", description: "Pay at your doorstep" },
]

const DEFAULT_ITEMS: CartItem[] = [
  {
    id: "sku-1",
    name: "Bridge Tee",
    subtitle: "Midweight, 100% cotton",
    price: 28,
    quantity: 1,
    stock: 8,
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "sku-2",
    name: "Everyday Tote",
    subtitle: "Recycled canvas",
    price: 52,
    quantity: 1,
    stock: 5,
    image:
      "https://images.unsplash.com/photo-1587397845856-e6cf49176c70?q=80&w=1200&auto=format&fit=crop",
  },
]

const COUPONS: Coupon[] = [
  { code: "SAVE10", type: "percent", value: 10 },
  { code: "WELCOME15", type: "percent", value: 15 },
  { code: "TAKE5", type: "fixed", value: 5 },
  { code: "FREESHIP", type: "shipping" },
]

const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
}

function formatCurrency(amount: number, currency: Currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${CURRENCY_SYMBOL[currency]}${amount.toFixed(2)}`
  }
}

const STORAGE_KEYS = {
  cart: "bridge.cart.v1",
  address: "bridge.checkout.address.v1",
  step: "bridge.checkout.step.v1",
  coupon: "bridge.checkout.coupon.v1",
  shipping: "bridge.checkout.shipping.v1",
  payment: "bridge.checkout.payment.v1",
  guest: "bridge.checkout.guest.v1",
  note: "bridge.checkout.note.v1",
  email: "bridge.checkout.email.v1",
}

export default function ShoppingCart({
  className,
  style,
  initialItems = DEFAULT_ITEMS,
  savedAddresses = [],
  shippingOptions = DEFAULT_SHIPPING,
  paymentMethods = DEFAULT_PAYMENT,
  allowGuestCheckout = true,
  currency = "USD",
  taxRate = 0.0725,
  onOrderComplete,
}: ShoppingCartProps) {
  const [step, setStep] = useState<CheckoutStep>("cart")
  const [cart, setCart] = useState<CartItem[]>(initialItems)
  const [couponInput, setCouponInput] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [selectedShipping, setSelectedShipping] = useState<string>(shippingOptions[0]?.id ?? "standard")
  const [selectedPayment, setSelectedPayment] = useState<string>(paymentMethods[0]?.id ?? "card")
  const [useSavedAddressId, setUseSavedAddressId] = useState<string | "new">(
    savedAddresses.find((a) => a.isDefault)?.id ?? (savedAddresses[0]?.id || "new"),
  )
  const [guestCheckout, setGuestCheckout] = useState<boolean>(allowGuestCheckout)
  const [contactEmail, setContactEmail] = useState<string>("")
  const [orderNote, setOrderNote] = useState<string>("")
  const [address, setAddress] = useState<Address>({
    id: "new",
    label: "New address",
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    email: "",
  })
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)

  // Load persisted state
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const savedCart = window.localStorage.getItem(STORAGE_KEYS.cart)
      const savedStep = window.localStorage.getItem(STORAGE_KEYS.step)
      const savedCoupon = window.localStorage.getItem(STORAGE_KEYS.coupon)
      const savedShipping = window.localStorage.getItem(STORAGE_KEYS.shipping)
      const savedPayment = window.localStorage.getItem(STORAGE_KEYS.payment)
      const savedGuest = window.localStorage.getItem(STORAGE_KEYS.guest)
      const savedNote = window.localStorage.getItem(STORAGE_KEYS.note)
      const savedEmail = window.localStorage.getItem(STORAGE_KEYS.email)
      const savedAddr = window.localStorage.getItem(STORAGE_KEYS.address)

      if (savedCart) {
        const parsed: CartItem[] = JSON.parse(savedCart)
        setCart(parsed)
      }
      if (savedStep && ["cart", "details", "shipping", "payment", "review", "success"].includes(savedStep)) {
        setStep(savedStep as CheckoutStep)
      }
      if (savedCoupon) {
        const found = COUPONS.find((c) => c.code === savedCoupon)
        if (found) setAppliedCoupon(found)
      }
      if (savedShipping) setSelectedShipping(savedShipping)
      if (savedPayment) setSelectedPayment(savedPayment)
      if (savedGuest) setGuestCheckout(savedGuest === "true")
      if (savedNote) setOrderNote(savedNote)
      if (savedEmail) setContactEmail(savedEmail)
      if (savedAddr) {
        const parsedAddress: Address = JSON.parse(savedAddr)
        setAddress(parsedAddress)
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist state
  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.step, step)
  }, [step])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.coupon, appliedCoupon?.code ?? "")
  }, [appliedCoupon])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.shipping, selectedShipping)
  }, [selectedShipping])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.payment, selectedPayment)
  }, [selectedPayment])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.guest, String(guestCheckout))
  }, [guestCheckout])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.note, orderNote)
  }, [orderNote])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.email, contactEmail)
  }, [contactEmail])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEYS.address, JSON.stringify(address))
  }, [address])

  // Derived amounts
  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart],
  )

  const shippingCost = useMemo(() => {
    const method = shippingOptions.find((m) => m.id === selectedShipping) ?? shippingOptions[0]
    if (!method) return 0
    if (appliedCoupon?.type === "shipping") return 0
    return method.cost
  }, [selectedShipping, shippingOptions, appliedCoupon])

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0
    if (appliedCoupon.type === "percent" && appliedCoupon.value) {
      return (subtotal * appliedCoupon.value) / 100
    }
    if (appliedCoupon.type === "fixed" && appliedCoupon.value) {
      return Math.min(appliedCoupon.value, subtotal)
    }
    return 0
  }, [appliedCoupon, subtotal])

  const taxedSubtotal = useMemo(() => Math.max(subtotal - discount, 0), [subtotal, discount])
  const tax = useMemo(() => +(taxedSubtotal * taxRate).toFixed(2), [taxedSubtotal, taxRate])
  const total = useMemo(() => +(taxedSubtotal + tax + shippingCost).toFixed(2), [taxedSubtotal, tax, shippingCost])

  // Inventory validation
  const validateQty = (item: CartItem, nextQty: number) => {
    if (nextQty < 1) return true
    if (nextQty > item.stock) {
      toast.error(`Only ${item.stock} left in stock for ${item.name}`)
      return false
    }
    return true
  }

  const updateQty = (id: string, nextQty: number) => {
    setCart((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it
        if (!validateQty(it, nextQty)) return it
        return { ...it, quantity: nextQty }
      }),
    )
  }

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((it) => it.id !== id))
    toast("Item removed", { icon: "🗑️" })
  }

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    const found = COUPONS.find((c) => c.code === code)
    if (!found) {
      toast.error("Coupon not recognized")
      return
    }
    setAppliedCoupon(found)
    toast.success(`Coupon applied: ${found.code}`)
  }

  const clearCoupon = () => {
    setAppliedCoupon(null)
    setCouponInput("")
  }

  const isCartEmpty = cart.length === 0

  const canProceedFromCart = !isCartEmpty
  const canProceedFromDetails =
    (guestCheckout ? Boolean(contactEmail) : true) &&
    (useSavedAddressId !== "new"
      ? Boolean(savedAddresses.find((a) => a.id === useSavedAddressId))
      : Boolean(address.fullName && address.line1 && address.city && address.postalCode && address.country))
  const canProceedFromShipping = Boolean(selectedShipping)
  const canProceedFromPayment = Boolean(selectedPayment)

  const selectedShippingMethod = shippingOptions.find((m) => m.id === selectedShipping) ?? shippingOptions[0]
  const selectedPaymentMethod = paymentMethods.find((p) => p.id === selectedPayment) ?? paymentMethods[0]
  const selectedAddress: Address =
    useSavedAddressId !== "new"
      ? (savedAddresses.find((a) => a.id === useSavedAddressId) as Address)
      : {
          ...address,
          id: "new",
          label: "New address",
        }

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true)
    // Simulate API latency and email confirmation
    await new Promise((r) => setTimeout(r, 900))
    const orderId = `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const order = {
      id: orderId,
      items: cart,
      subtotal,
      discount,
      shipping: shippingCost,
      tax,
      total,
      address: selectedAddress,
      shippingMethod: selectedShippingMethod,
      paymentMethod: selectedPaymentMethod,
      email: contactEmail || selectedAddress.email,
      note: orderNote,
      coupon: appliedCoupon?.code,
    }
    toast.success("Order placed successfully")
    if (order.email) {
      toast("Confirmation email sent", { description: `We've emailed your receipt to ${order.email}`, icon: "✉️" })
    }
    onOrderComplete?.(order)
    setStep("success")
    setIsPlacingOrder(false)
    // Optionally clear cart after success
    setCart([])
  }

  const goBack = () => {
    const order: CheckoutStep[] = ["cart", "details", "shipping", "payment", "review", "success"]
    const idx = order.indexOf(step)
    if (idx > 0) setStep(order[idx - 1])
  }

  const renderHeader = () => {
    return (
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-foreground">
          {step === "cart" ? <ShoppingCartIcon className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight md:text-lg">Checkout</h3>
          <p className="text-xs text-muted-foreground md:text-sm">
            {step === "cart" && "Review your items"}
            {step === "details" && "Shipping details"}
            {step === "shipping" && "Choose shipping method"}
            {step === "payment" && "Select payment"}
            {step === "review" && "Review and confirm your order"}
            {step === "success" && "Order placed"}
          </p>
        </div>
      </div>
    )
  }

  const Stepper = () => {
    const steps: { key: CheckoutStep; label: string }[] = [
      { key: "cart", label: "Cart" },
      { key: "details", label: "Details" },
      { key: "shipping", label: "Shipping" },
      { key: "payment", label: "Payment" },
      { key: "review", label: "Review" },
    ]
    const currentIdx = steps.findIndex((s) => s.key === step)
    return (
      <div className="flex w-full items-center gap-2">
        {steps.map((s, i) => {
          const active = s.key === step
          const complete = i < currentIdx
          return (
            <div key={s.key} className="flex w-full items-center gap-2">
              <div
                className={cn(
                  "flex h-9 min-w-0 items-center rounded-full border px-3",
                  active ? "border-foreground bg-card" : "border-border bg-secondary",
                )}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    complete ? "bg-foreground text-primary-foreground" : active ? "bg-accent" : "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? <CircleCheckBig className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("truncate text-xs font-medium", active ? "" : "text-muted-foreground")}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          )
        })}
      </div>
    )
  }

  const Summary = () => (
    <Card className="bg-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base md:text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.subtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity, currency)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-${item.id}`} className="text-xs text-muted-foreground">
                      Qty
                    </Label>
                    <Input
                      id={`qty-${item.id}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value || 1)
                        updateQty(item.id, next)
                      }}
                      className="h-8 w-16 bg-card"
                      aria-label={`Quantity for ${item.name}`}
                    />
                    <span className="text-xs text-muted-foreground">In stock: {item.stock}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {isCartEmpty && (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal, currency)}</span>
          </div>
          {appliedCoupon && discount > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Discount {appliedCoupon.type === "percent" ? `(${appliedCoupon.value}%)` : ""}{" "}
                {appliedCoupon.type === "shipping" ? "(Free shipping)" : ""}
              </span>
              <span className="font-medium text-success">- {formatCurrency(discount, currency)}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">{formatCurrency(shippingCost, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated tax</span>
            <span className="font-medium">{formatCurrency(tax, currency)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-extrabold">{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const CartStep = () => (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <ShoppingCartIcon className="h-5 w-5" />
            Cart
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-secondary">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    {item.subtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">Unit price: {formatCurrency(item.price, currency)}</p>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(item.price * item.quantity, currency)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`qty-cart-${item.id}`} className="text-xs text-muted-foreground">
                      Qty
                    </Label>
                    <Input
                      id={`qty-cart-${item.id}`}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value || 1)
                        updateQty(item.id, next)
                      }}
                      className="h-8 w-20 bg-card"
                      aria-label={`Quantity for ${item.name}`}
                    />
                    <span className="text-xs text-muted-foreground">Stock: {item.stock}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-md border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <TicketMinus className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="coupon" className="text-xs text-muted-foreground">
                  Coupon code
                </Label>
              </div>
              <div className="flex flex-1 gap-2">
                <Input
                  id="coupon"
                  placeholder="Enter code (e.g., SAVE10, FREESHIP)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="bg-card"
                />
                <Button type="button" variant="secondary" onClick={applyCoupon} aria-label="Apply coupon">
                  Apply
                </Button>
                {appliedCoupon ? (
                  <Button type="button" variant="ghost" onClick={clearCoupon} className="text-muted-foreground">
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
            {appliedCoupon ? (
              <p className="mt-2 text-xs text-success">
                Applied: {appliedCoupon.code}{" "}
                {appliedCoupon.type === "percent" ? `(${appliedCoupon.value}%)` : appliedCoupon.type === "fixed" ? `(${formatCurrency(appliedCoupon.value || 0, currency)})` : "(Free shipping)"}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Summary />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <History className="h-4 w-4" />
          Prices and availability are updated in real time.
        </div>
        <Button
          disabled={!canProceedFromCart}
          onClick={() => setStep("details")}
          className="bg-foreground text-primary-foreground hover:opacity-90"
        >
          Checkout
        </Button>
      </div>
    </div>
  )

  const DetailsStep = () => (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Contact & Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {allowGuestCheckout && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Guest checkout</p>
                <p className="text-xs text-muted-foreground">No account required.</p>
              </div>
              <Switch
                checked={guestCheckout}
                onCheckedChange={setGuestCheckout}
                aria-label="Toggle guest checkout"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email for updates</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="bg-card"
              />
              <p className="text-xs text-muted-foreground">We&#39;ll send order confirmations here.</p>
            </div>

            {savedAddresses.length > 0 && (
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Saved addresses</Label>
                <RadioGroup
                  value={useSavedAddressId}
                  onValueChange={(v) => setUseSavedAddressId(v as string)}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      htmlFor={`addr-${addr.id}`}
                      className={cn(
                        "cursor-pointer rounded-md border p-3 hover:bg-secondary",
                        useSavedAddressId === addr.id ? "border-foreground" : "border-border",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <RadioGroupItem id={`addr-${addr.id}`} value={addr.id} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {addr.label} {addr.isDefault ? "(Default)" : ""}
                          </p>
                          <p className="break-words text-xs text-muted-foreground">
                            {addr.fullName}, {addr.line1}
                            {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}
                            {addr.state ? `, ${addr.state}` : ""} {addr.postalCode}, {addr.country}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                  <label
                    htmlFor="addr-new"
                    className={cn(
                      "cursor-pointer rounded-md border p-3 hover:bg-secondary",
                      useSavedAddressId === "new" ? "border-foreground" : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <RadioGroupItem id="addr-new" value="new" />
                      <div>
                        <p className="text-sm font-medium">Use a new address</p>
                        <p className="text-xs text-muted-foreground">Fill the form below.</p>
                      </div>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}

            {useSavedAddressId === "new" && (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    value={address.fullName}
                    onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line1">Address line 1</Label>
                  <Input
                    id="line1"
                    value={address.line1}
                    onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="line2">Address line 2 (optional)</Label>
                  <Input
                    id="line2"
                    value={address.line2}
                    onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Region</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input
                    id="postalCode"
                    value={address.postalCode}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={address.country}
                    onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    value={address.phone}
                    onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))}
                    className="bg-card"
                  />
                </div>
              </>
            )}

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="note">Order notes (optional)</Label>
              <Textarea
                id="note"
                placeholder="Special instructions for delivery..."
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                className="bg-card min-h-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Summary />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <CircleChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep("shipping")}
          disabled={!canProceedFromDetails}
          className="bg-foreground text-primary-foreground hover:opacity-90"
        >
          Continue to shipping
        </Button>
      </div>
    </div>
  )

  const ShippingStep = () => (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Shipping method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedShipping} onValueChange={setSelectedShipping} className="grid gap-3">
            {shippingOptions.map((m) => (
              <label
                key={m.id}
                htmlFor={`ship-${m.id}`}
                className={cn(
                  "cursor-pointer rounded-md border p-3 hover:bg-secondary",
                  selectedShipping === m.id ? "border-foreground" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem id={`ship-${m.id}`} value={m.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-sm font-semibold">{formatCurrency(appliedCoupon?.type === "shipping" ? 0 : m.cost, currency)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.description} {m.eta ? `• ${m.eta}` : ""}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
          {appliedCoupon?.type === "shipping" && (
            <div className="rounded-md bg-accent px-3 py-2 text-xs">
              Free shipping applied via coupon {appliedCoupon.code}
            </div>
          )}
        </CardContent>
      </Card>

      <Summary />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <CircleChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep("payment")}
          disabled={!canProceedFromShipping}
          className="bg-foreground text-primary-foreground hover:opacity-90"
        >
          Continue to payment
        </Button>
      </div>
    </div>
  )

  const PaymentStep = () => (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment} className="grid gap-3">
            {paymentMethods.map((p) => (
              <label
                key={p.id}
                htmlFor={`pay-${p.id}`}
                className={cn(
                  "cursor-pointer rounded-md border p-3 hover:bg-secondary",
                  selectedPayment === p.id ? "border-foreground" : "border-border",
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem id={`pay-${p.id}`} value={p.id} />
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    {p.description ? <p className="text-xs text-muted-foreground">{p.description}</p> : null}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>

          {selectedPayment === "card" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cardName">Name on card</Label>
                <Input id="cardName" placeholder="First Last" className="bg-card" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input id="cardNumber" inputMode="numeric" placeholder="1234 5678 9012 3456" className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exp">Expiry</Label>
                <Input id="exp" placeholder="MM/YY" className="bg-card" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" inputMode="numeric" placeholder="123" className="bg-card" />
              </div>
            </div>
          )}

          {selectedPayment === "wallet" && (
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <WalletMinimal className="h-4 w-4" />
              Use a linked wallet (Apple Pay / Google Pay) at confirmation.
            </div>
          )}

          {selectedPayment === "cod" && (
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <PackageCheck className="h-4 w-4" />
              Pay with cash when your order is delivered.
            </div>
          )}
        </CardContent>
      </Card>

      <Summary />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <CircleChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep("review")}
          disabled={!canProceedFromPayment}
          className="bg-foreground text-primary-foreground hover:opacity-90"
        >
          Review order
        </Button>
      </div>
    </div>
  )

  const ReviewStep = () => (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-medium">Items</p>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.name} <span className="text-muted-foreground">× {item.quantity}</span>
                    </p>
                    {item.subtitle ? <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p> : null}
                  </div>
                  <p className="text-sm font-semibold">{formatCurrency(item.price * item.quantity, currency)}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium">Shipping to</p>
              <p className="break-words text-sm">
                {selectedAddress.fullName}
                <br />
                {selectedAddress.line1}
                {selectedAddress.line2 ? <>, {selectedAddress.line2}</> : null}
                <br />
                {selectedAddress.city}
                {selectedAddress.state ? `, ${selectedAddress.state}` : ""} {selectedAddress.postalCode}
                <br />
                {selectedAddress.country}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Method & Contact</p>
              <p className="text-sm">
                {selectedShippingMethod.label} • {selectedShippingMethod.eta}
                <br />
                {selectedPaymentMethod.label}
                <br />
                {contactEmail || selectedAddress.email}
              </p>
            </div>
          </div>

          {orderNote ? (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Notes</p>
                <p className="text-sm text-muted-foreground">{orderNote}</p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Summary />

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} className="gap-2">
          <CircleChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder || cart.length === 0}
          className="bg-foreground text-primary-foreground hover:opacity-90"
        >
          {isPlacingOrder ? "Placing order..." : "Place order"}
        </Button>
      </div>
    </div>
  )

  const SuccessStep = () => (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
          <CircleCheckBig className="h-7 w-7" />
        </div>
        <h4 className="text-lg font-extrabold">Order confirmed</h4>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Thank you for your purchase. A confirmation email has been sent{contactEmail ? ` to ${contactEmail}` : ""}.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>We&#39;re preparing your items</span>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-base md:text-lg">What&#39;s next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <PackageCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Packed and shipped</p>
              <p className="text-muted-foreground">You&#39;ll receive another email once your order ships.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <WalletMinimal className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Receipt</p>
              <p className="text-muted-foreground">Keep your email for your records and returns.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            setStep("cart")
          }}
          variant="secondary"
          className="gap-2"
        >
          <ShoppingBasket className="h-4 w-4" />
          Continue shopping
        </Button>
      </div>
    </div>
  )

  return (
    <section className={cn("w-full max-w-full", className)} style={style} aria-label="Shopping cart and checkout">
      <div className="mb-4">{renderHeader()}</div>
      <div className="mb-4">
        <Stepper />
      </div>

      <div className="grid gap-6">
        {step === "cart" && <CartStep />}
        {step === "details" && <DetailsStep />}
        {step === "shipping" && <ShippingStep />}
        {step === "payment" && <PaymentStep />}
        {step === "review" && <ReviewStep />}
        {step === "success" && <SuccessStep />}
      </div>
    </section>
  )
}