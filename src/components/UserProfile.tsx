"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleUserRound,
  CreditCard,
  Lock,
  Settings2,
  User,
  UserPen,
  Contact,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  imageUrl?: string;
};

type Order = {
  id: string;
  date: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  trackingNumber?: string;
  shippingAddressSummary?: string;
};

type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

type PaymentMethod = {
  id: string;
  brand: "visa" | "mastercard" | "amex" | "discover" | "other";
  last4: string;
  expiry: string; // MM/YY
  name: string;
  isDefault?: boolean;
};

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
};

type NotificationPrefs = {
  orders: boolean;
  promotions: boolean;
  recommendations: boolean;
  security: boolean;
  sms: boolean;
  push: boolean;
};

export type UserProfileProps = {
  className?: string;
  style?: React.CSSProperties;
  defaultTab?: "profile" | "orders" | "addresses" | "payments" | "settings" | "support";
  profile?: Profile;
  orders?: Order[];
  addresses?: Address[];
  paymentMethods?: PaymentMethod[];
  notificationPrefs?: NotificationPrefs;
  onUpdateProfile?: (data: Profile) => Promise<void> | void;
  onChangePassword?: (current: string, next: string) => Promise<void> | void;
  onAddAddress?: (address: Omit<Address, "id">) => Promise<Address | void> | void;
  onUpdateAddress?: (address: Address) => Promise<void> | void;
  onDeleteAddress?: (id: string) => Promise<void> | void;
  onAddPayment?: (method: Omit<PaymentMethod, "id">) => Promise<PaymentMethod | void> | void;
  onDeletePayment?: (id: string) => Promise<void> | void;
  onSetDefaultPayment?: (id: string) => Promise<void> | void;
  onUpdateNotifications?: (prefs: NotificationPrefs) => Promise<void> | void;
  onDeleteAccount?: () => Promise<void> | void;
  onRequestReturn?: (orderId: string, reason: string, details?: string) => Promise<void> | void;
  onReorder?: (orderId: string) => Promise<void> | void;
  onContactSupport?: (payload: { subject: string; message: string }) => Promise<void> | void;
};

const fallbackOrders: Order[] = [
  {
    id: "ORD-2025-0001",
    date: "2025-08-21",
    total: 189.5,
    status: "delivered",
    trackingNumber: "1Z999AA10123456784",
    shippingAddressSummary: "221B Baker St, London",
    items: [
      {
        id: "sku-1",
        name: "Brushed Cotton Hoodie",
        qty: 1,
        price: 89.5,
        imageUrl:
          "https://images.unsplash.com/photo-1520975682031-a2b2ae8346f9?q=80&w=1200&auto=format&fit=crop",
      },
      {
        id: "sku-2",
        name: "Everyday Chino Pants",
        qty: 1,
        price: 100.0,
        imageUrl:
          "https://images.unsplash.com/photo-1548883354-7622d03aca28?q=80&w=1200&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "ORD-2025-0002",
    date: "2025-09-02",
    total: 79.0,
    status: "shipped",
    trackingNumber: "1Z999AA10123456785",
    shippingAddressSummary: "742 Evergreen Terrace",
    items: [
      {
        id: "sku-3",
        name: "Performance Tee",
        qty: 2,
        price: 39.5,
        imageUrl:
          "https://images.unsplash.com/photo-1520975682031-a2b2ae8346f9?q=80&w=1200&auto=format&fit=crop",
      },
    ],
  },
  {
    id: "ORD-2025-0003",
    date: "2025-09-07",
    total: 59.0,
    status: "processing",
    items: [
      {
        id: "sku-4",
        name: "Canvas Cap",
        qty: 1,
        price: 29.5,
        imageUrl:
          "https://images.unsplash.com/photo-1503341455253-b2e723bb3dbb?q=80&w=1200&auto=format&fit=crop",
      },
      {
        id: "sku-5",
        name: "Merino Socks (2-pack)",
        qty: 1,
        price: 29.5,
        imageUrl:
          "https://images.unsplash.com/photo-1533867617858-e7b97b4b0aea?q=80&w=1200&auto=format&fit=crop",
      },
    ],
  },
];

const fallbackAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Alex Johnson",
    line1: "221B Baker Street",
    city: "London",
    state: "",
    postalCode: "NW1 6XE",
    country: "United Kingdom",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    name: "Alex Johnson",
    line1: "742 Evergreen Terrace",
    city: "Springfield",
    state: "IL",
    postalCode: "62704",
    country: "United States",
    phone: "+1 (555) 123-9876",
  },
];

const fallbackPayments: PaymentMethod[] = [
  { id: "pm-1", brand: "visa", last4: "4242", expiry: "04/28", name: "Alex Johnson", isDefault: true },
  { id: "pm-2", brand: "mastercard", last4: "4444", expiry: "11/27", name: "Alex Johnson" },
];

const fallbackProfile: Profile = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex.johnson@example.com",
  phone: "+1 (555) 234-5678",
  avatarUrl: "",
  bio: "Lover of simple design and great products.",
};

const fallbackPrefs: NotificationPrefs = {
  orders: true,
  promotions: false,
  recommendations: true,
  security: true,
  sms: false,
  push: true,
};

function formatCurrency(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function statusToBadge(status: OrderStatus) {
  switch (status) {
    case "processing":
      return { label: "Processing", className: "bg-muted text-foreground" };
    case "shipped":
      return { label: "Shipped", className: "bg-chart-3/10 text-chart-3" };
    case "delivered":
      return { label: "Delivered", className: "bg-[#dcfce7] text-[#16a34a]" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-destructive/10 text-destructive" };
    case "refunded":
      return { label: "Refunded", className: "bg-accent text-foreground" };
    default:
      return { label: status, className: "bg-muted text-foreground" };
  }
}

export default function UserProfile({
  className,
  style,
  defaultTab = "profile",
  profile: profileProp,
  orders: ordersProp,
  addresses: addressesProp,
  paymentMethods: paymentProp,
  notificationPrefs: prefsProp,
  onUpdateProfile,
  onChangePassword,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
  onAddPayment,
  onDeletePayment,
  onSetDefaultPayment,
  onUpdateNotifications,
  onDeleteAccount,
  onRequestReturn,
  onReorder,
  onContactSupport,
}: UserProfileProps) {
  const [tab, setTab] = useState(defaultTab);
  const [profile, setProfile] = useState<Profile>(profileProp || fallbackProfile);
  const [orders, setOrders] = useState<Order[]>(ordersProp || fallbackOrders);
  const [addresses, setAddresses] = useState<Address[]>(addressesProp || fallbackAddresses);
  const [payments, setPayments] = useState<PaymentMethod[]>(paymentProp || fallbackPayments);
  const [prefs, setPrefs] = useState<NotificationPrefs>(prefsProp || fallbackPrefs);

  // Profile image preview
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(profile.avatarUrl || undefined);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  // Form state for password
  const [pwLoading, setPwLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Support form
  const [supportLoading, setSupportLoading] = useState(false);

  // Address form dialog
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  // Payment form dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Order details
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const openOrder = useMemo(() => orders.find((o) => o.id === openOrderId), [openOrderId, orders]);

  // Return request
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnReason, setReturnReason] = useState<string>("");
  const [returnDetails, setReturnDetails] = useState<string>("");

  const handleAvatarChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image must be less than 4MB.");
      return;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setAvatarPreview(url);
    toast.message("Preview updated", { description: "Remember to save changes to update your profile picture." });
  };

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const next: Profile = {
      firstName: String(data.get("firstName") || "").trim(),
      lastName: String(data.get("lastName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      bio: String(data.get("bio") || "").trim(),
      avatarUrl: avatarPreview || profile.avatarUrl || "",
    };

    if (!/^\S+@\S+\.\S+$/.test(next.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setProfile(next);
    try {
      await onUpdateProfile?.(next);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile. Please try again.");
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwLoading) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("currentPassword") || "");
    const next = String(data.get("newPassword") || "");
    const confirm = String(data.get("confirmPassword") || "");
    if (!current || !next) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    setPwLoading(true);
    try {
      await onChangePassword?.(current, next);
      form.reset();
      toast.success("Password updated");
    } catch {
      toast.error("Could not update password.");
    } finally {
      setPwLoading(false);
    }
  }

  async function handleReorder(orderId: string) {
    try {
      await onReorder?.(orderId);
      toast.success("Items added to your cart");
    } catch {
      toast.error("Reorder failed. Please try again.");
    }
  }

  async function handleRequestReturn(orderId: string) {
    if (!returnReason) {
      toast.error("Please select a reason for your return.");
      return;
    }
    setReturnLoading(true);
    try {
      await onRequestReturn?.(orderId, returnReason, returnDetails);
      toast.success("Return request submitted");
      setReturnReason("");
      setReturnDetails("");
      setOpenOrderId(null);
    } catch {
      toast.error("Failed to submit return request.");
    } finally {
      setReturnLoading(false);
    }
  }

  function resetAddressDialog() {
    setEditingAddress(null);
    setAddressDialogOpen(false);
  }

  async function saveAddress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      label: String(data.get("label") || ""),
      name: String(data.get("name") || ""),
      line1: String(data.get("line1") || ""),
      line2: String(data.get("line2") || ""),
      city: String(data.get("city") || ""),
      state: String(data.get("state") || ""),
      postalCode: String(data.get("postalCode") || ""),
      country: String(data.get("country") || ""),
      phone: String(data.get("phone") || ""),
      isDefault: Boolean(data.get("isDefault")),
    };

    if (!payload.label || !payload.name || !payload.line1 || !payload.city || !payload.postalCode || !payload.country) {
      toast.error("Please complete required fields.");
      return;
    }

    try {
      if (editingAddress) {
        const updated: Address = { ...editingAddress, ...payload };
        setAddresses((prev) => prev.map((a) => (a.id === editingAddress.id ? updated : a)));
        await onUpdateAddress?.(updated);
        toast.success("Address updated");
      } else {
        const created = {
          ...payload,
          id: `addr-${Math.random().toString(36).slice(2, 8)}`,
        } as Address;
        setAddresses((prev) => {
          let next = payload.isDefault
            ? prev.map((a) => ({ ...a, isDefault: false }))
            : prev.slice();
          next.unshift(created);
          return next;
        });
        const server = (await onAddAddress?.(payload)) as Address | void;
        if (server && server.id) {
          setAddresses((prev) => prev.map((a) => (a.id === created.id ? server : a)));
        }
        toast.success("Address added");
      }
      resetAddressDialog();
    } catch {
      toast.error("Could not save address.");
    }
  }

  async function deleteAddress(id: string) {
    try {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      await onDeleteAddress?.(id);
      toast.success("Address removed");
    } catch {
      toast.error("Failed to delete address.");
    }
  }

  function openEditAddress(a: Address) {
    setEditingAddress(a);
    setAddressDialogOpen(true);
  }

  function resetPaymentDialog() {
    setPaymentDialogOpen(false);
  }

  async function addPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const brand = String(data.get("brand") || "other") as PaymentMethod["brand"];
    const name = String(data.get("cardName") || "");
    const number = String(data.get("cardNumber") || "").replace(/\s+/g, "");
    const expiry = String(data.get("expiry") || "");
    const isDefault = Boolean(data.get("isDefault"));

    if (!name || !number || !expiry) {
      toast.error("Please complete payment details.");
      return;
    }
    if (!/^\d{12,19}$/.test(number)) {
      toast.error("Card number looks invalid.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      toast.error("Expiry must be in MM/YY format.");
      return;
    }

    const method: PaymentMethod = {
      id: `pm-${Math.random().toString(36).slice(2, 8)}`,
      brand,
      last4: number.slice(-4),
      name,
      expiry,
      isDefault,
    };

    try {
      setPayments((prev) => {
        const next = isDefault ? prev.map((p) => ({ ...p, isDefault: false })) : prev.slice();
        next.unshift(method);
        return next;
      });
      const server = (await onAddPayment?.({
        brand,
        last4: method.last4,
        name,
        expiry,
        isDefault,
      })) as PaymentMethod | void;
      if (server && server.id) {
        setPayments((prev) => prev.map((p) => (p.id === method.id ? server : p)));
      }
      toast.success("Payment method added");
      resetPaymentDialog();
    } catch {
      toast.error("Could not add payment method.");
    }
  }

  async function removePayment(id: string) {
    try {
      setPayments((prev) => prev.filter((p) => p.id !== id));
      await onDeletePayment?.(id);
      toast.success("Payment method removed");
    } catch {
      toast.error("Failed to remove payment method.");
    }
  }

  async function setDefaultPayment(id: string) {
    try {
      setPayments((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
      await onSetDefaultPayment?.(id);
      toast.success("Default payment method set");
    } catch {
      toast.error("Failed to set default payment.");
    }
  }

  async function savePrefs(next: NotificationPrefs) {
    setPrefs(next);
    try {
      await onUpdateNotifications?.(next);
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save preferences.");
    }
  }

  async function deleteAccount() {
    try {
      await onDeleteAccount?.();
      toast.success("Your account has been scheduled for deletion");
    } catch {
      toast.error("Could not delete account.");
    }
  }

  async function submitSupport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (supportLoading) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const subject = String(data.get("subject") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!subject || !message) {
      toast.error("Please fill out subject and message.");
      return;
    }
    setSupportLoading(true);
    try {
      await onContactSupport?.({ subject, message });
      toast.success("Support message sent");
      form.reset();
    } catch {
      toast.error("Failed to send message.");
    } finally {
      setSupportLoading(false);
    }
  }

  return (
    <section
      className={cn(
        "w-full max-w-full bg-card rounded-lg border border-border shadow-sm",
        "p-4 sm:p-6 md:p-8",
        className
      )}
      style={style}
      aria-label="User account management"
    >
      <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="relative">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-secondary">
              {avatarPreview ? (
                <AvatarImage src={avatarPreview} alt={`${profile.firstName} ${profile.lastName}`} />
              ) : profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={`${profile.firstName} ${profile.lastName}`} />
              ) : (
                <AvatarFallback className="bg-secondary text-foreground">
                  <CircleUserRound className="h-7 w-7" />
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold truncate">
              {profile.firstName} {profile.lastName}
            </h3>
            <p className="text-muted-foreground text-sm sm:text-base truncate">{profile.email}</p>
          </div>
        </div>
        <Separator />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="grid grid-cols-2 sm:flex bg-secondary">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <UserPen className="h-4 w-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="addresses" className="gap-2">
              <CircleUserRound className="h-4 w-4" /> Addresses
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2">
              <CreditCard className="h-4 w-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings2 className="h-4 w-4" /> Settings
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <Contact className="h-4 w-4" /> Support
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-6">
          <div className="grid gap-8">
            <form onSubmit={saveProfile} className="grid gap-6">
              <div className="grid md:grid-cols-[auto,1fr] gap-4 sm:gap-6 items-start">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-20 w-20 ring-2 ring-secondary">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} alt="Avatar preview" />
                    ) : profile.avatarUrl ? (
                      <AvatarImage src={profile.avatarUrl} alt="Current avatar" />
                    ) : (
                      <AvatarFallback className="bg-secondary text-foreground">
                        <CircleUserRound className="h-8 w-8" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="avatar"
                      className="px-3 py-2 rounded-md bg-secondary hover:bg-muted cursor-pointer text-sm"
                    >
                      Upload
                    </Label>
                    <Input
                      id="avatar"
                      name="avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      aria-label="Upload profile picture"
                    />
                    {avatarPreview && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="text-xs"
                        onClick={() => {
                          if (objectUrlRef.current) {
                            URL.revokeObjectURL(objectUrlRef.current);
                            objectUrlRef.current = null;
                          }
                          setAvatarPreview(undefined);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        defaultValue={profile.firstName}
                        required
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        defaultValue={profile.lastName}
                        required
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        defaultValue={profile.email}
                        required
                        placeholder="name@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        defaultValue={profile.phone}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      defaultValue={profile.bio}
                      rows={3}
                      placeholder="Tell us a little about yourself"
                      className="resize-y"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="submit">Save changes</Button>
              </div>
            </form>

            <Separator />

            <form onSubmit={changePassword} className="grid gap-4" aria-label="Change password">
              <h4 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" /> Password
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input id="currentPassword" name="currentPassword" type="password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="showPass"
                    checked={showNewPassword}
                    onCheckedChange={(v) => setShowNewPassword(Boolean(v))}
                    aria-label="Toggle password visibility"
                  />
                  <Label htmlFor="showPass" className="text-sm">
                    Show passwords
                  </Label>
                </div>
                <Button type="submit" disabled={pwLoading}>
                  {pwLoading ? "Updating..." : "Update password"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <div className="grid gap-4">
            {orders.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground bg-secondary">
                No orders yet.
              </div>
            )}
            <ul className="grid gap-4">
              {orders.map((order) => {
                const badge = statusToBadge(order.status);
                return (
                  <li
                    key={order.id}
                    className="rounded-lg border border-border bg-card p-4 sm:p-5 flex flex-col gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h5 className="font-semibold text-base md:text-lg break-words">{order.id}</h5>
                          <Badge className={cn("capitalize", badge.className)}>{badge.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Placed on {new Date(order.date).toLocaleDateString()} • {formatCurrency(order.total)}
                        </p>
                        {order.trackingNumber && (
                          <p className="text-xs text-muted-foreground mt-1 break-words">
                            Tracking: {order.trackingNumber}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Dialog open={openOrderId === order.id} onOpenChange={(o) => setOpenOrderId(o ? order.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="secondary" size="sm">
                              View details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Order {order.id}</DialogTitle>
                              <DialogDescription>
                                Placed on {new Date(order.date).toLocaleString()}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span>Status</span>
                                  <Badge className={cn("capitalize", badge.className)}>{badge.label}</Badge>
                                </div>
                                <div className="font-medium">{formatCurrency(order.total)}</div>
                              </div>
                              {order.shippingAddressSummary && (
                                <p className="text-sm text-muted-foreground break-words">
                                  Ship to: {order.shippingAddressSummary}
                                </p>
                              )}
                              <ul className="grid gap-3">
                                {order.items.map((it) => (
                                  <li key={it.id} className="flex items-center gap-3 min-w-0">
                                    <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                      {it.imageUrl ? (
                                        // Decorative image; accessibility via item text
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={it.imageUrl}
                                          alt=""
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                        />
                                      ) : (
                                        <div className="h-full w-full" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium truncate">{it.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Qty {it.qty} • {formatCurrency(it.price)}
                                      </p>
                                    </div>
                                    <div className="ml-auto text-sm font-medium">
                                      {formatCurrency(it.qty * it.price)}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <Separator />
                              <div className="grid gap-3">
                                <div className="grid gap-2">
                                  <Label htmlFor={`return-reason-${order.id}`}>Request return/refund</Label>
                                  <Select
                                    onValueChange={(v) => setReturnReason(v)}
                                    value={openOrderId === order.id ? returnReason : ""}
                                  >
                                    <SelectTrigger id={`return-reason-${order.id}`}>
                                      <SelectValue placeholder="Select a reason" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="wrong-size">Wrong size</SelectItem>
                                      <SelectItem value="damaged">Item arrived damaged</SelectItem>
                                      <SelectItem value="not-as-described">Not as described</SelectItem>
                                      <SelectItem value="changed-mind">Changed my mind</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Textarea
                                    value={openOrderId === order.id ? returnDetails : ""}
                                    onChange={(e) => setReturnDetails(e.target.value)}
                                    placeholder="Additional details (optional)"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="flex items-center justify-between">
                              <DialogClose asChild>
                                <Button variant="ghost">Close</Button>
                              </DialogClose>
                              <Button
                                onClick={() => handleRequestReturn(order.id)}
                                disabled={returnLoading}
                              >
                                {returnLoading ? "Submitting..." : "Submit return"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" onClick={() => handleReorder(order.id)}>
                          Reorder
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto py-1">
                      {order.items.map((it) => (
                        <div
                          key={it.id}
                          className="min-w-[220px] rounded-md border border-border bg-secondary p-3 flex items-center gap-3"
                        >
                          <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {it.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-full w-full" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{it.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty {it.qty} • {formatCurrency(it.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="addresses" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Address book</h4>
            <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add address</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingAddress ? "Edit address" : "Add address"}</DialogTitle>
                  <DialogDescription>Specify your shipping details.</DialogDescription>
                </DialogHeader>
                <form onSubmit={saveAddress} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="label">Label</Label>
                    <Input id="label" name="label" defaultValue={editingAddress?.label} placeholder="Home, Office" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" name="name" defaultValue={editingAddress?.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="line1">Address line 1</Label>
                    <Input id="line1" name="line1" defaultValue={editingAddress?.line1} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="line2">Address line 2</Label>
                    <Input id="line2" name="line2" defaultValue={editingAddress?.line2} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" name="city" defaultValue={editingAddress?.city} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State/Region</Label>
                      <Input id="state" name="state" defaultValue={editingAddress?.state} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal code</Label>
                      <Input id="postalCode" name="postalCode" defaultValue={editingAddress?.postalCode} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" name="country" defaultValue={editingAddress?.country} required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" defaultValue={editingAddress?.phone} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isDefault"
                      name="isDefault"
                      defaultChecked={Boolean(editingAddress?.isDefault)}
                    />
                    <Label htmlFor="isDefault" className="text-sm">
                      Set as default address
                    </Label>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" onClick={resetAddressDialog}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">{editingAddress ? "Save" : "Add"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <ul className="grid gap-4">
            {addresses.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-border p-4 bg-secondary flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{a.label || "Address"}</p>
                    {a.isDefault && <Badge className="bg-accent text-foreground">Default</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 break-words">
                    <p>{a.name}</p>
                    <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                    <p>
                      {a.city}
                      {a.state ? `, ${a.state}` : ""} {a.postalCode}
                    </p>
                    <p>{a.country}</p>
                    {a.phone && <p>Phone: {a.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEditAddress(a)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteAddress(a.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Payment methods</h4>
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button>Add payment</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a payment method</DialogTitle>
                  <DialogDescription>Card details are encrypted and stored securely.</DialogDescription>
                </DialogHeader>
                <form onSubmit={addPayment} className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="cardName">Name on card</Label>
                    <Input id="cardName" name="cardName" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <Input id="cardNumber" name="cardNumber" inputMode="numeric" placeholder="4242 4242 4242 4242" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                      <Input id="expiry" name="expiry" placeholder="04/28" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brand">Brand</Label>
                      <Select name="brand" defaultValue="visa">
                        <SelectTrigger id="brand">
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visa">Visa</SelectItem>
                          <SelectItem value="mastercard">Mastercard</SelectItem>
                          <SelectItem value="amex">Amex</SelectItem>
                          <SelectItem value="discover">Discover</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="pmDefault" name="isDefault" />
                    <Label htmlFor="pmDefault" className="text-sm">Set as default</Label>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="ghost" onClick={resetPaymentDialog}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit">Add card</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <ul className="grid gap-3">
            {payments.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-border bg-secondary p-4 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-md bg-card border border-border grid place-items-center uppercase text-sm font-semibold">
                  {p.brand === "visa" ? "V" : p.brand === "mastercard" ? "MC" : p.brand === "amex" ? "AX" : p.brand === "discover" ? "DI" : "CC"}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    •••• •••• •••• {p.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">Exp {p.expiry} • {p.name}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {p.isDefault ? (
                    <Badge className="bg-accent text-foreground">Default</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setDefaultPayment(p.id)}>
                      Set default
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => removePayment(p.id)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-8">
            <div className="grid gap-4">
              <h4 className="font-semibold">Notifications</h4>
              <div className="grid gap-3">
                <PrefRow
                  label="Order updates"
                  description="Get updates about your orders and delivery."
                  checked={prefs.orders}
                  onChange={(v) => savePrefs({ ...prefs, orders: v })}
                />
                <PrefRow
                  label="Promotions"
                  description="Receive emails about sales and product launches."
                  checked={prefs.promotions}
                  onChange={(v) => savePrefs({ ...prefs, promotions: v })}
                />
                <PrefRow
                  label="Recommendations"
                  description="Personalized suggestions based on your activity."
                  checked={prefs.recommendations}
                  onChange={(v) => savePrefs({ ...prefs, recommendations: v })}
                />
                <PrefRow
                  label="Security alerts"
                  description="Important notifications about your account security."
                  checked={prefs.security}
                  onChange={(v) => savePrefs({ ...prefs, security: v })}
                />
                <PrefRow
                  label="SMS messages"
                  description="Text messages for critical updates."
                  checked={prefs.sms}
                  onChange={(v) => savePrefs({ ...prefs, sms: v })}
                />
                <PrefRow
                  label="Push notifications"
                  description="Alerts on your device for timely updates."
                  checked={prefs.push}
                  onChange={(v) => savePrefs({ ...prefs, push: v })}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4">
              <h4 className="font-semibold">Danger zone</h4>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete account</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription>
                      This action is permanent. Your orders and data may be scheduled for deletion. You can contact support if this was a mistake.
                    </DialogDescription>
                  </DialogHeader>
                  <DeleteConfirm onConfirm={deleteAccount} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <div className="grid gap-4">
            <h4 className="font-semibold">Contact support</h4>
            <form onSubmit={submitSupport} className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="How can we help?" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={4} placeholder="Describe your issue or question" required />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={supportLoading}>
                  {supportLoading ? "Sending..." : "Send message"}
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-secondary p-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(v) => onChange(Boolean(v))}
        aria-label={label}
      />
    </div>
  );
}

function DeleteConfirm({ onConfirm }: { onConfirm: () => Promise<void> | void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const canDelete = text.toLowerCase().trim() === "delete";

  async function handle() {
    if (!canDelete || loading) return;
    setLoading(true);
    try {
      await onConfirm();
      toast.success("Account deletion requested");
    } catch {
      toast.error("Failed to delete account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="confirm">Type DELETE to confirm</Label>
        <Input
          id="confirm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="DELETE"
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button variant="destructive" onClick={handle} disabled={!canDelete || loading}>
          {loading ? "Deleting..." : "Delete account"}
        </Button>
      </DialogFooter>
    </>
  );
}