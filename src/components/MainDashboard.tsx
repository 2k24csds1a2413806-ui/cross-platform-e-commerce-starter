"use client";

import * as React from "react";
import {
  LayoutDashboard,
  PanelLeft,
  ChartSpline,
  SquareMenu,
  LayoutTemplate,
  Plus,
  Trash2 } from
"lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback } from
"@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator } from
"@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetTrigger } from
"@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger } from
"@/components/ui/tabs";

type KPI = {
  label: string;
  value: string;
  delta?: {value: string;positive?: boolean;};
};

type Order = {
  id: string;
  customer: string;
  total: string;
  status: "Paid" | "Pending" | "Refunded";
  date: string;
};

type Activity = {
  id: string;
  time: string;
  text: string;
  meta?: string;
};

export interface MainDashboardProps {
  className?: string;
  onNavigate?: (section: string) => void;
  kpis?: KPI[];
  recentOrders?: Order[];
  activity?: Activity[];
}

const defaultKpis: KPI[] = [
{ label: "Revenue", value: "₹48,920", delta: { value: "+8.2%", positive: true } },
{ label: "Orders", value: "1,284", delta: { value: "+2.4%", positive: true } },
{ label: "Customers", value: "3,742", delta: { value: "+1.1%", positive: true } },
{ label: "Refunds", value: "₹1,090", delta: { value: "-0.6%" } }];


const defaultOrders: Order[] = [
{ id: "#1024", customer: "Alex Morgan", total: "₹129.00", status: "Paid", date: "2h ago" },
{ id: "#1023", customer: "Jordan Lee", total: "₹82.50", status: "Pending", date: "4h ago" },
{ id: "#1022", customer: "Taylor Kim", total: "₹245.99", status: "Paid", date: "Yesterday" },
{ id: "#1021", customer: "Sam Rivers", total: "₹59.40", status: "Refunded", date: "Yesterday" }];


const defaultActivity: Activity[] = [
{ id: "a1", time: "Now", text: "New order placed by Alex Morgan", meta: "#1025" },
{ id: "a2", time: "2h", text: "Low inventory on \"Canvas Backpack\"", meta: "6 left" },
{ id: "a3", time: "4h", text: "Payout processed to bank", meta: "₹3,200" },
{ id: "a4", time: "Yesterday", text: "New customer signed up", meta: "olivia@…" }];


export default function MainDashboard({
  className,
  onNavigate,
  kpis = defaultKpis,
  recentOrders = defaultOrders,
  activity = defaultActivity
}: MainDashboardProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("7d");

  // Sales Analyzer state
  type SalesRow = {id: string;product: string;qty: number;price: number;cost: number;};
  const [period, setPeriod] = React.useState<"monthly" | "yearly">("monthly");
  const [rows, setRows] = React.useState<SalesRow[]>([
  { id: "r-1", product: "", qty: 0, price: 0, cost: 0 }]
  );
  const [bulkRowCount, setBulkRowCount] = React.useState(5);

  const totals = React.useMemo(() => {
    const revenue = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.price) || 0), 0);
    const cost = rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.cost) || 0), 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? profit / revenue : 0;
    return { revenue, cost, profit, margin };
  }, [rows]);

  const aiSummary = React.useMemo(() => {
    const fmt = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "INR" });
    const status = totals.profit === 0 ? "breakeven" : totals.profit > 0 ? "profit" : "loss";
    const top = rows.
    map((r) => ({
      product: r.product || "Untitled",
      p: (Number(r.qty) || 0) * ((Number(r.price) || 0) - (Number(r.cost) || 0))
    })).
    sort((a, b) => b.p - a.p)[0];
    const topLine = top && top.p !== 0 ? ` Top contributor: ${top.product} (${fmt(Math.abs(top.p))} ${top.p >= 0 ? "profit" : "loss"}).` : "";
    return `AI analysis (${period}): ${status.toUpperCase()} of ${fmt(Math.abs(totals.profit))} with revenue ${fmt(totals.revenue)} and cost ${fmt(totals.cost)}. Gross margin ${(totals.margin * 100).toFixed(1)}%.${topLine}`;
  }, [totals, rows, period]);

  function updateRow(id: string, patch: Partial<SalesRow>) {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  }
  function addRow() {
    setRows((prev) => [...prev, { id: `r-${Date.now()}`, product: "", qty: 0, price: 0, cost: 0 }]);
  }
  function addBulkRows() {
    const count = Math.max(1, Math.min(20, bulkRowCount));
    const newRows = Array.from({ length: count }, (_, i) => ({
      id: `r-${Date.now()}-${i}`,
      product: "",
      qty: 0,
      price: 0,
      cost: 0
    }));
    setRows((prev) => [...prev, ...newRows]);
    toast.success(`Added ${count} rows`);
  }
  function removeRow(id: string) {
    setRows((prev) => prev.length > 1 ? prev.filter((r) => r.id !== id) : prev);
  }
  function clearAllRows() {
    setRows([{ id: `r-${Date.now()}`, product: "", qty: 0, price: 0, cost: 0 }]);
    toast.message("All rows cleared");
  }

  function handleQuickAction(action: string) {
    toast(`${action}`, { description: "This is a demo action." });
  }

  function handleNavigate(section: string) {
    onNavigate?.(section);
    toast("Navigate", { description: `Go to ${section}` });
  }

  return (
    <section className={cn("w-full bg-background text-foreground", className)}>
      <div className="w-full max-w-full rounded-2xl bg-card shadow-sm ring-1 ring-border">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border !w-[782px] !h-[79px]">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Open navigation">

                  <PanelLeft className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <MobileSidebar onNavigate={(s) => {handleNavigate(s);setMobileOpen(false);}} />
              </SheetContent>
            </Sheet>
            <div className="hidden sm:flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
              <h3 className="text-base sm:text-lg font-semibold">Dashboard</h3>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search orders, customers..."
                  aria-label="Search"
                  className="w-[200px] lg:w-[320px] bg-secondary border-input focus-visible:ring-ring" />

              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="relative" aria-label="Open notifications">
                  <span className="sr-only">Notifications</span>
                  {/* Using available icon */}
                  <LayoutTemplate className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none text-destructive-foreground">
                    3
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("New order", { description: "Order #1025 placed" })}>
                  New order: #1025
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Low stock", { description: "Canvas Backpack" })}>
                  Low stock: Canvas Backpack
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Payout", { description: "Payout sent to bank" })}>
                  Payout processed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("Open notifications center")}>
                  View all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="pl-2 pr-3">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px]">JD</AvatarFallback>
                  </Avatar>
                  <span className="ml-2 hidden sm:inline text-sm font-medium">Jordan</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigate("profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleNavigate("settings")}>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("Signed out")}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Sidebar (desktop) */}
          <aside className="hidden sm:block w-[240px] shrink-0 border-r border-border">
            <DesktopSidebar onNavigate={handleNavigate} />
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1">
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-6">
                {/* Sales Analyzer (AI) */}
                <section>
                  <Card className="bg-card border-border">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <ChartSpline className="h-5 w-5" />
                        <CardTitle className="text-base sm:text-lg">Sales analyzer (AI)</CardTitle>
                      </div>
                      <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="monthly">Monthly</TabsTrigger>
                          <TabsTrigger value="yearly">Yearly</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground">
                          <div className="col-span-4">Product</div>
                          <div className="col-span-2">Qty</div>
                          <div className="col-span-2">Price</div>
                          <div className="col-span-2">Cost</div>
                          <div className="col-span-2 text-right">Row P/L</div>
                        </div>
                        <Separator />
                        {rows.map((r) => {
                          const rowPL = (Number(r.qty) || 0) * ((Number(r.price) || 0) - (Number(r.cost) || 0));
                          return (
                            <div key={r.id} className="grid grid-cols-12 gap-2 items-center">
                              <Input
                                value={r.product}
                                onChange={(e) => updateRow(r.id, { product: e.target.value })}
                                placeholder="Product name"
                                className="col-span-4 bg-secondary border-input" />

                              <Input
                                type="number"
                                value={r.qty}
                                onChange={(e) => updateRow(r.id, { qty: Number(e.target.value) })}
                                placeholder="0"
                                className="col-span-2 bg-secondary border-input" />

                              <Input
                                type="number"
                                value={r.price}
                                onChange={(e) => updateRow(r.id, { price: Number(e.target.value) })}
                                placeholder="0"
                                className="col-span-2 bg-secondary border-input" />

                              <Input
                                type="number"
                                value={r.cost}
                                onChange={(e) => updateRow(r.id, { cost: Number(e.target.value) })}
                                placeholder="0"
                                className="col-span-2 bg-secondary border-input" />

                              <div className={cn("col-span-2 text-right text-sm", rowPL >= 0 ? "text-success" : "text-destructive")}>
                                {rowPL.toLocaleString(undefined, { style: "currency", currency: "INR" })}
                              </div>
                              <div className="col-span-12 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => removeRow(r.id)}>Remove</Button>
                              </div>
                            </div>);

                        })}
                        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="secondary" onClick={addRow}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add row
                            </Button>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="20"
                                value={bulkRowCount}
                                onChange={(e) => setBulkRowCount(Number(e.target.value))}
                                className="w-16 h-9 bg-secondary border-input"
                                aria-label="Number of rows to add"
                              />
                              <Button variant="secondary" onClick={addBulkRows}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add multiple
                              </Button>
                            </div>
                            <Button variant="ghost" size="sm" onClick={clearAllRows}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Clear all
                            </Button>
                          </div>
                          <div className="text-sm">
                            <span className="mr-3">Revenue: {totals.revenue.toLocaleString(undefined, { style: "currency", currency: "INR" })}</span>
                            <span className="mr-3">Cost: {totals.cost.toLocaleString(undefined, { style: "currency", currency: "INR" })}</span>
                            <Badge className={cn("rounded-full", totals.profit >= 0 ? "bg-success-soft text-success" : "bg-destructive text-destructive-foreground")}>
                              {totals.profit >= 0 ? "+" : "-"}
                              {Math.abs(totals.profit).toLocaleString(undefined, { style: "currency", currency: "INR" })}
                            </Badge>
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg border border-border bg-secondary p-3 text-sm">
                          {aiSummary}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* Quick actions */}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleQuickAction("Add product")} className="bg-primary text-primary-foreground">
                    <SquareMenu className="h-4 w-4 mr-2" />
                    Add product
                  </Button>
                  <Button variant="secondary" onClick={() => handleQuickAction("Create order")}>
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Create order
                  </Button>
                  <Button variant="secondary" onClick={() => handleQuickAction("Generate report")}>
                    <ChartSpline className="h-4 w-4 mr-2" />
                    Generate report
                  </Button>
                </div>

                {/* KPIs */}
                <section aria-label="Key metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {kpis.map((k) =>
                  <Card key={k.label} className="bg-card border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground">{k.label}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-end justify-between">
                        <div className="text-2xl font-semibold">{k.value}</div>
                        {k.delta &&
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-full",
                          k.delta.positive ? "bg-success-soft text-success" : "bg-muted text-foreground"
                        )}
                        aria-label={`${k.delta.positive ? "Increase" : "Decrease"} ${k.delta.value}`}>

                            {k.delta.value}
                          </Badge>
                      }
                      </CardContent>
                    </Card>
                  )}
                </section>

                {/* Charts and recent orders */}
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <Card className="xl:col-span-2 bg-card border-border">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <ChartSpline className="h-5 w-5" />
                        <CardTitle className="text-base sm:text-lg">Sales overview</CardTitle>
                      </div>
                      <Tabs
                        value={range}
                        onValueChange={(v) => setRange(v as typeof range)}
                        className="w-full sm:w-auto">

                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="7d">7d</TabsTrigger>
                          <TabsTrigger value="30d">30d</TabsTrigger>
                          <TabsTrigger value="90d">90d</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full">
                        <ResponsiveMiniChart range={range} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Recent orders</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Separator />
                      <ul className="max-w-full">
                        {recentOrders.map((o) =>
                        <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="size-8 rounded-lg bg-secondary grid place-items-center shrink-0">
                              <SquareMenu className="h-4 w-4" aria-hidden="true" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium truncate">{o.customer}</p>
                                <p className="text-sm text-muted-foreground shrink-0">{o.date}</p>
                              </div>
                              <div className="mt-0.5 flex items-center justify-between gap-2">
                                <p className="text-sm text-muted-foreground truncate">{o.id}</p>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                  variant="secondary"
                                  className={cn(
                                    "rounded-full",
                                    o.status === "Paid" ?
                                    "bg-success-soft text-success" :
                                    o.status === "Refunded" ?
                                    "bg-muted text-foreground" :
                                    "bg-accent text-foreground"
                                  )}>

                                    {o.status}
                                  </Badge>
                                  <p className="text-sm font-medium">{o.total}</p>
                                </div>
                              </div>
                            </div>
                          </li>
                        )}
                      </ul>
                      <div className="px-4 py-3">
                        <Button variant="secondary" className="w-full" onClick={() => handleNavigate("orders")}>
                          View all orders
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* Activity and shortcuts */}
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <Card className="bg-card border-border xl:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Separator />
                      <ul className="divide-y divide-border">
                        {activity.map((a) =>
                        <li key={a.id} className="px-4 py-3 flex items-start gap-3">
                            <div className="mt-1 size-2.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm break-words">
                                {a.text} {a.meta ? <span className="text-muted-foreground">· {a.meta}</span> : null}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{a.time}</p>
                            </div>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base sm:text-lg">Shortcuts</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" className="justify-start" onClick={() => handleNavigate("products")}>
                        <SquareMenu className="h-4 w-4 mr-2" />
                        Products
                      </Button>
                      <Button variant="secondary" className="justify-start" onClick={() => handleNavigate("customers")}>
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        Customers
                      </Button>
                      <Button variant="secondary" className="justify-start" onClick={() => handleNavigate("analytics")}>
                        <ChartSpline className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                      <Button variant="secondary" className="justify-start" onClick={() => handleNavigate("settings")}>
                        <LayoutDashboard className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </CardContent>
                  </Card>
                </section>
              </div>
            </ScrollArea>
          </main>
        </div>
      </div>
    </section>);

}

function DesktopSidebar({ onNavigate }: {onNavigate?: (s: string) => void;}) {
  const items = [
  { key: "dashboard", label: "Overview", icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", icon: ChartSpline },
  { key: "settings", label: "Settings", icon: LayoutTemplate }] as
  const;

  return (
    <nav aria-label="Main" className="p-3">
      <div className="px-2 py-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Bridge Commerce</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
      <Separator className="my-2" />
      <ul className="space-y-1">
        {items.map((item) =>
        <li key={item.key}>
            <Button
            variant="ghost"
            className="w-full justify-start gap-2 rounded-lg data-[state=active]:bg-secondary"
            onClick={() => onNavigate?.(item.key)}>

              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">{item.label}</span>
            </Button>
          </li>
        )}
      </ul>
    </nav>);

}

function MobileSidebar({ onNavigate }: {onNavigate?: (s: string) => void;}) {
  return (
    <div className="h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Bridge Commerce</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          <li>
            <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg" onClick={() => onNavigate?.("dashboard")}>
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </Button>
          </li>
          <li>
            <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg" onClick={() => onNavigate?.("analytics")}>
              <ChartSpline className="h-4 w-4" />
              Analytics
            </Button>
          </li>
          <li>
            <Button variant="ghost" className="w-full justify-start gap-2 rounded-lg" onClick={() => onNavigate?.("settings")}>
              <LayoutTemplate className="h-4 w-4" />
              Settings
            </Button>
          </li>
        </ul>
      </nav>
    </div>);

}

function ResponsiveMiniChart({ range }: {range: "7d" | "30d" | "90d";}) {
  // Lightweight SVG chart; data mocked by range
  const data = React.useMemo(() => {
    const length = range === "7d" ? 7 : range === "30d" ? 30 : 18;
    const base = range === "7d" ? 60 : range === "30d" ? 50 : 55;
    return Array.from({ length }, (_, i) => {
      const variance = Math.sin(i / (range === "7d" ? 1.4 : 2.6)) * 14;
      const noise = i % 3 * 3;
      return Math.max(12, base + variance + noise);
    });
  }, [range]);

  const max = Math.max(...data);
  const min = Math.min(...data);
  const padding = 8;
  const w = 600;
  const h = 220;
  const stepX = (w - padding * 2) / Math.max(1, data.length - 1);

  const points = data.
  map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + (max - v) / Math.max(1, max - min) * (h - padding * 2);
    return `${x},${y}`;
  }).
  join(" ");

  const gradientId = "chartGradient";

  return (
    <div className="w-full">
      <div className="w-full overflow-hidden rounded-xl border border-border bg-secondary">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          role="img"
          aria-label="Sales over time"
          className="block w-full h-auto">

          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-3)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--chart-3)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3].map((i) => {
            const y = padding + i / 3 * (h - padding * 2);
            return (
              <line
                key={i}
                x1={padding}
                x2={w - padding}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4" />);


          })}

          {/* Area */}
          <polyline
            points={`${points} ${w - padding},${h - padding} ${padding},${h - padding}`}
            fill={`url(#${gradientId})`}
            stroke="none" />


          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--chart-3)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round" />


          {/* Last point indicator */}
          {(() => {
            const last = data.length - 1;
            const x = padding + last * stepX;
            const y = padding + (max - data[last]) / Math.max(1, max - min) * (h - padding * 2);
            return (
              <>
                <circle cx={x} cy={y} r="4.5" fill="var(--card)" stroke="var(--chart-3)" strokeWidth="2" />
              </>);

          })()}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last quarter"}</span>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: "var(--chart-3)" }} />
          Sales
        </div>
      </div>
    </div>);

}