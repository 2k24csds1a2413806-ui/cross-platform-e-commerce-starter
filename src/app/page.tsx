"use client";

import React, { useMemo, useState, useCallback } from "react";
import AuthenticationFlow from "@/components/AuthenticationFlow";
import MainDashboard from "@/components/MainDashboard";
import ProductCatalog, { type CatalogProduct } from "@/components/ProductCatalog";
import ShoppingCart from "@/components/ShoppingCart";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Package,
  ShoppingCart as ShoppingCartIcon,
  CircleUserRound,
  LogIn,
  Menu,
  Store,
} from "lucide-react";

type View = "auth" | "dashboard" | "catalog" | "cart" | "profile";

type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
  subtitle?: string;
};

export default function Page() {
  const [view, setView] = useState<View>("auth");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);

  const cartCount = useMemo(() => cart.reduce((n, it) => n + it.quantity, 0), [cart]);

  const products: CatalogProduct[] = useMemo(
    () => [
      {
        id: "p-001",
        name: "Bridge Tee",
        price: 28,
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1600&auto=format&fit=crop",
        category: "apparel",
        sku: "TEE-001",
        brand: "Bridge",
        inStock: true,
        inventoryCount: 12,
        description: "Midweight tee in soft cotton with a classic fit.",
      },
      {
        id: "p-002",
        name: "Everyday Tote",
        price: 52,
        image: "https://images.unsplash.com/photo-1587397845856-e6cf49176c70?q=80&w=1600&auto=format&fit=crop",
        category: "bags",
        sku: "TOTE-001",
        brand: "Bridge",
        inStock: true,
        inventoryCount: 5,
        description: "Recycled canvas tote for daily carry.",
      },
      {
        id: "p-003",
        name: "Canvas Backpack",
        price: 89.5,
        image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop",
        category: "bags",
        sku: "PACK-002",
        brand: "Bridge",
        inStock: true,
        inventoryCount: 3,
        description: "Sturdy backpack with padded laptop compartment.",
      },
      {
        id: "p-004",
        name: "Merino Socks (2-pack)",
        price: 29.5,
        image: "https://images.unsplash.com/photo-1533867617858-e7b97b4b0aea?q=80&w=1600&auto=format&fit=crop",
        category: "accessories",
        sku: "SOCK-002",
        brand: "Bridge",
        inStock: true,
        inventoryCount: 18,
        description: "Temperature-regulating comfort for all-day wear.",
      },
      {
        id: "p-005",
        name: "Brushed Cotton Hoodie",
        price: 89.5,
        image: "https://images.unsplash.com/photo-1520975682031-a2b2ae8346f9?q=80&w=1600&auto=format&fit=crop",
        category: "apparel",
        sku: "HOOD-001",
        brand: "Bridge",
        inStock: true,
        inventoryCount: 7,
        description: "Soft brushed interior with a modern silhouette.",
      },
    ],
    []
  );

  const handleNavigate = useCallback(
    (section: string) => {
      if (section === "orders" || section === "customers" || section === "settings" || section === "analytics" || section === "dashboard") {
        setView("dashboard");
      }
      if (section === "products") {
        setView("catalog");
      }
      if (section === "profile") {
        setView("profile");
      }
    },
    []
  );

  const handleAddToCart = useCallback((p: CatalogProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        const nextQty = existing.quantity + 1;
        const stock = p.inventoryCount ?? existing.stock ?? 1;
        return prev.map((i) => (i.id === p.id ? { ...i, quantity: Math.min(nextQty, stock) } : i));
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          price: p.price,
          image:
            p.image ||
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop",
          quantity: 1,
          stock: p.inventoryCount ?? 10,
          subtitle: p.brand,
        },
      ];
    });
  }, []);

  const handleOrderComplete = useCallback(() => {
    // Immediately navigate away to avoid rendering the "success" step that may use undefined icons in the child.
    setView("dashboard");
    setCart([]);
  }, []);

  const AppHeader = () => {
    return (
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <MobileNav
                  loggedIn={loggedIn}
                  current={view}
                  onNavigate={(v) => {
                    setView(v);
                    setMobileOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Store className="h-4 w-4" />
              </div>
              <p className="font-semibold">Bridge Commerce</p>
            </div>

            <div className="ml-auto hidden sm:flex items-center gap-2">
              <NavButton
                active={view === "dashboard"}
                onClick={() => setView("dashboard")}
                icon={<LayoutDashboard className="h-4 w-4" />}
              >
                Dashboard
              </NavButton>
              <NavButton
                active={view === "catalog"}
                onClick={() => setView("catalog")}
                icon={<Package className="h-4 w-4" />}
              >
                Catalog
              </NavButton>
              <NavButton
                active={view === "cart"}
                onClick={() => setView("cart")}
                icon={<ShoppingCartIcon className="h-4 w-4" />}
                badge={cartCount > 0 ? String(cartCount) : undefined}
              >
                Cart
              </NavButton>
              <NavButton
                active={view === "profile"}
                onClick={() => setView("profile")}
                icon={<CircleUserRound className="h-4 w-4" />}
              >
                Account
              </NavButton>
            </div>

            <div className="ml-2">
              {loggedIn ? (
                <Button variant="secondary" size="sm" onClick={() => { setLoggedIn(false); setView("auth"); }}>
                  Sign out
                </Button>
              ) : (
                <Button size="sm" onClick={() => setView("auth")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
    );
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {!loggedIn && view === "auth" ? (
          <div className="flex w-full items-center justify-center py-10">
            <AuthenticationFlow
              initialMode="login"
              onEmailLogin={async () => {
                setLoggedIn(true);
                setView("dashboard");
              }}
              onEmailSignup={async () => {
                setLoggedIn(true);
                setView("dashboard");
              }}
              onSocialLogin={async () => {
                setLoggedIn(true);
                setView("dashboard");
              }}
            />
          </div>
        ) : (
          <div className="grid gap-6">
            {/* When authenticated, show the app views */}
            {view === "dashboard" && (
              <section className="space-y-4">
                <MainDashboard onNavigate={handleNavigate} />
              </section>
            )}

            {view === "catalog" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">Browse products</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setView("dashboard")}>
                      Back to dashboard
                    </Button>
                    <Button onClick={() => setView("cart")} className="relative">
                      <ShoppingCartIcon className="mr-2 h-4 w-4" />
                      View cart
                      {cartCount > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
                <ProductCatalog
                  products={products}
                  onAddToCart={(p) => {
                    handleAddToCart(p);
                  }}
                  onCompare={() => {}}
                />
              </section>
            )}

            {view === "cart" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">Your cart</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setView("catalog")}>
                      Continue shopping
                    </Button>
                  </div>
                </div>
                <ShoppingCart
                  initialItems={cart}
                  onOrderComplete={handleOrderComplete}
                />
              </section>
            )}

            {view === "profile" && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-semibold">Account</h2>
                  <Button variant="secondary" onClick={() => setView("dashboard")}>
                    Back to dashboard
                  </Button>
                </div>
                <UserProfile />
              </section>
            )}
          </div>
        )}
      </main>
      <footer className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Separator className="mb-4" />
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bridge Commerce. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  children,
  badge,
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: string;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className="gap-2 relative"
    >
      {icon}
      <span className="hidden md:inline">{children}</span>
      {badge ? (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-2 rounded-full px-1.5 py-0 text-[10px] leading-4"
        >
          {badge}
        </Badge>
      ) : null}
    </Button>
  );
}

function MobileNav({
  loggedIn,
  current,
  onNavigate,
}: {
  loggedIn: boolean;
  current: View;
  onNavigate: (v: View) => void;
}) {
  return (
    <nav className="h-full bg-card">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Bridge Commerce</p>
            <p className="text-xs text-muted-foreground">{loggedIn ? "Signed in" : "Guest"}</p>
          </div>
        </div>
      </div>
      <ul className="p-2 space-y-1">
        <li>
          <Button
            variant={current === "dashboard" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => onNavigate("dashboard")}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
        </li>
        <li>
          <Button
            variant={current === "catalog" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => onNavigate("catalog")}
          >
            <Package className="h-4 w-4" />
            Catalog
          </Button>
        </li>
        <li>
          <Button
            variant={current === "cart" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => onNavigate("cart")}
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Cart
          </Button>
        </li>
        <li>
          <Button
            variant={current === "profile" ? "default" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => onNavigate("profile")}
          >
            <CircleUserRound className="h-4 w-4" />
            Account
          </Button>
        </li>
        {!loggedIn && (
          <li>
            <Button
              variant={current === "auth" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => onNavigate("auth")}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </li>
        )}
      </ul>
    </nav>
  );
}