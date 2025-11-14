"use client";

import React, { useMemo, useState, useCallback } from "react";
import AuthenticationFlow from "@/components/AuthenticationFlow";
import MainDashboard from "@/components/MainDashboard";
import UserProfile from "@/components/UserProfile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CircleUserRound,
  LogIn,
  Menu,
  Store,
} from "lucide-react";

type View = "auth" | "dashboard" | "profile";

export default function Page() {
  const [view, setView] = useState<View>("auth");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const handleNavigate = useCallback(
    (section: string) => {
      if (section === "orders" || section === "customers" || section === "settings" || section === "analytics" || section === "dashboard") {
        setView("dashboard");
      }
      if (section === "profile") {
        setView("profile");
      }
    },
    []
  );

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
            {view === "dashboard" && (
              <section className="space-y-4">
                <MainDashboard onNavigate={handleNavigate} />
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
}: {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className="gap-2 relative"
    >
      {icon}
      <span className="hidden md:inline">{children}</span>
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