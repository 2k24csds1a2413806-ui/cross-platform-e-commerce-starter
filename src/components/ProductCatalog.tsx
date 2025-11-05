"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ListFilter, GalleryVertical, SquareMenu, PackagePlus, Package, Barcode, ChevronsRightLeft, QrCode, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CatalogProduct = {
  id: string;
  name: string;
  price: number;
  image?: string;
  category?: string;
  sku?: string;
  brand?: string;
  rating?: number;
  reviewsCount?: number;
  inStock?: boolean;
  inventoryCount?: number;
  description?: string;
};

type SortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "newest";

export interface ProductCatalogProps {
  className?: string;
  style?: React.CSSProperties;
  products?: CatalogProduct[];
  isAdmin?: boolean;
  loading?: boolean;
  error?: string | null;
  initialView?: "grid" | "list";
  pageSizeOptions?: number[];
  defaultPageSize?: number;
  onAddToCart?: (product: CatalogProduct) => Promise<void> | void;
  onToggleWishlist?: (product: CatalogProduct, wished: boolean) => Promise<void> | void;
  onBulkAction?: (action: "delete" | "discount" | "feature", ids: string[]) => Promise<void> | void;
  onCompare?: (ids: string[]) => void;
  onRetry?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600&auto=format&fit=crop";

export default function ProductCatalog({
  className,
  style,
  products = [],
  isAdmin = false,
  loading = false,
  error = null,
  initialView = "grid",
  pageSizeOptions = [12, 24, 48],
  defaultPageSize = 12,
  onAddToCart,
  onToggleWishlist,
  onBulkAction,
  onCompare,
  onRetry,
}: ProductCatalogProps) {
  const [view, setView] = useState<"grid" | "list">(initialView);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("relevance");
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);
  const [page, setPage] = useState(1);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyWishlist, setOnlyWishlist] = useState(false);
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [compare, setCompare] = useState<Record<string, boolean>>({});
  const [quickViewProduct, setQuickViewProduct] = useState<CatalogProduct | null>(null);

  useEffect(() => {
    setPage(1);
  }, [query, activeCategory, sort, pageSize, onlyInStock, onlyWishlist]);

  // categories derived from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) set.add(p.category);
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const computed = useMemo(() => {
    let list = [...products];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    if (activeCategory !== "all") {
      list = list.filter((p) => (p.category || "") === activeCategory);
    }
    if (onlyInStock) {
      list = list.filter((p) => p.inStock !== false && (p.inventoryCount ?? 1) > 0);
    }
    if (onlyWishlist) {
      list = list.filter((p) => wishlist[p.id]);
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price-desc":
        list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "newest":
        list.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "relevance":
      default:
        break;
    }
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return {
      total,
      totalPages,
      currentPage,
      items: list.slice(start, end),
    };
  }, [products, query, activeCategory, sort, pageSize, page, onlyInStock, onlyWishlist, wishlist]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const compareIds = useMemo(() => Object.keys(compare).filter((k) => compare[k]), [compare]);

  function toggleWishlist(p: CatalogProduct) {
    const next = !wishlist[p.id];
    setWishlist((w) => ({ ...w, [p.id]: next }));
    if (onToggleWishlist) {
      Promise.resolve(onToggleWishlist(p, next))
        .then(() => toast.success(next ? "Added to wishlist" : "Removed from wishlist"))
        .catch(() => {
          setWishlist((w) => ({ ...w, [p.id]: !next }));
          toast.error("Unable to update wishlist");
        });
    } else {
      toast.message(next ? "Wishlist updated" : "Wishlist removed");
    }
  }

  function handleAddToCart(p: CatalogProduct) {
    if (p.inStock === false || (p.inventoryCount ?? 0) <= 0) {
      toast.error("Out of stock");
      return;
    }
    if (onAddToCart) {
      Promise.resolve(onAddToCart(p))
        .then(() => toast.success("Added to cart"))
        .catch(() => toast.error("Failed to add to cart"));
    } else {
      toast.message("Added to cart");
    }
  }

  function toggleSelect(id: string, value?: boolean) {
    setSelected((prev) => ({ ...prev, [id]: value ?? !prev[id] }));
  }

  function toggleCompare(id: string) {
    setCompare((prev) => {
      const nextVal = !prev[id];
      let next = { ...prev, [id]: nextVal };
      const active = Object.keys(next).filter((k) => next[k]);
      if (active.length > 4) {
        // limit to 4; revert
        toast.error("You can compare up to 4 products");
        return prev;
      }
      return next;
    });
  }

  function bulkAction(action: "delete" | "discount" | "feature") {
    const ids = selectedIds;
    if (!ids.length) return;
    if (onBulkAction) {
      Promise.resolve(onBulkAction(action, ids))
        .then(() => {
          toast.success(`Bulk action '${action}' completed`);
          setSelected({});
        })
        .catch(() => toast.error("Bulk action failed"));
    } else {
      toast.message(`Bulk '${action}' for ${ids.length} item(s)`);
      setSelected({});
    }
  }

  // Pagination helpers
  const canPrev = computed.currentPage > 1;
  const canNext = computed.currentPage < computed.totalPages;

  const showEmpty = !loading && !error && computed.total === 0;

  return (
    <section className={cn("w-full bg-background", className)} style={style} aria-label="Product Catalog">
      <div className="w-full rounded-[var(--radius)] bg-card shadow-sm border border-border">
        {/* Top toolbar */}
        <div className="flex flex-col gap-3 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <Input
                aria-label="Search products"
                placeholder="Search products by name, brand, or SKU"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-secondary border-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ListFilter className="size-4" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={onlyInStock}
                    onCheckedChange={(v) => setOnlyInStock(Boolean(v))}
                  >
                    In stock only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={onlyWishlist}
                    onCheckedChange={(v) => setOnlyWishlist(Boolean(v))}
                  >
                    Wishlist only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Select
                value={sort}
                onValueChange={(v) => setSort(v as SortOption)}
              >
                <SelectTrigger className="w-[160px] bg-secondary border-input">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="name-asc">Name: A-Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z-A</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
              <div className="hidden md:flex items-center rounded-md bg-secondary p-1">
                <Button
                  size="icon"
                  variant={view === "grid" ? "default" : "ghost"}
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                >
                  <GalleryVertical className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant={view === "list" ? "default" : "ghost"}
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  <SquareMenu className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          {categories.length > 1 && (
            <Tabs
              defaultValue={activeCategory}
              value={activeCategory}
              onValueChange={setActiveCategory}
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                {categories.map((c) => (
                  <TabsTrigger key={c} value={c} className="capitalize">
                    {c}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeCategory} />
            </Tabs>
          )}

          {/* Admin bulk actions */}
          {isAdmin && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={
                    computed.items.length > 0 &&
                    computed.items.every((p) => selected[p.id])
                  }
                  onCheckedChange={(v) => {
                    const val = Boolean(v);
                    const next: Record<string, boolean> = { ...selected };
                    computed.items.forEach((p) => {
                      next[p.id] = val;
                    });
                    setSelected(next);
                  }}
                />
                <Label htmlFor="select-all" className="text-sm text-muted-foreground">
                  Select page
                </Label>
                {selectedIds.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {selectedIds.length} selected
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => bulkAction("feature")}
                >
                  Feature
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => bulkAction("discount")}
                >
                  Discount
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.length === 0}
                  onClick={() => bulkAction("delete")}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="px-4 md:px-5 pb-5">
          {/* Error state */}
          {error && (
            <div className="w-full rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-4 flex items-center justify-between">
              <p className="text-sm break-words">{error}</p>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className={cn(view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col divide-y divide-border")}>
              {Array.from({ length: pageSize }).map((_, i) =>
                view === "grid" ? (
                  <div key={i} className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-10 bg-muted rounded" />
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-4 p-4 animate-pulse">
                    <div className="w-28 h-28 bg-muted rounded-md" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-10 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                )
              )}
            </div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="rounded-full bg-secondary size-16 flex items-center justify-center mb-4">
                <Package className="size-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No products found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters to find what you’re looking for.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                    setOnlyInStock(false);
                    setOnlyWishlist(false);
                    setSort("relevance");
                    setPage(1);
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Results header */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(computed.currentPage - 1) * pageSize + 1}–
                  {Math.min(computed.currentPage * pageSize, computed.total)} of {computed.total}
                </p>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="w-[120px] bg-secondary border-input">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizeOptions.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product list */}
              {view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {computed.items.map((p) => (
                    <article
                      key={p.id}
                      className="group relative rounded-lg border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                      aria-label={p.name}
                    >
                      {isAdmin && (
                        <div className="absolute top-2 left-2 z-10">
                          <Checkbox
                            aria-label="Select product"
                            checked={!!selected[p.id]}
                            onCheckedChange={(v) => toggleSelect(p.id, Boolean(v))}
                            className="bg-card/90 backdrop-blur"
                          />
                        </div>
                      )}
                      <div className="relative overflow-hidden">
                        <img
                          src={p.image || FALLBACK_IMG}
                          alt={p.name}
                          className="w-full aspect-[4/3] object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-2 top-2 flex gap-2 justify-end">
                          {p.inStock === false || (p.inventoryCount ?? 0) <= 0 ? (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                              Out of stock
                            </Badge>
                          ) : p.inventoryCount && p.inventoryCount < 5 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                              Low stock
                            </Badge>
                          ) : null}
                        </div>
                        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            className="bg-primary/90 hover:bg-primary text-primary-foreground"
                            onClick={() => handleAddToCart(p)}
                          >
                            <PackagePlus className="mr-2 size-4" />
                            Add
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant={compare[p.id] ? "default" : "secondary"}
                              aria-pressed={!!compare[p.id]}
                              title="Compare"
                              onClick={() => toggleCompare(p.id)}
                            >
                              <ChevronsRightLeft className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={wishlist[p.id] ? "default" : "secondary"}
                              aria-pressed={!!wishlist[p.id]}
                              title="Wishlist"
                              onClick={() => toggleWishlist(p)}
                            >
                              <QrCode className="size-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              title="Quick view"
                              onClick={() => setQuickViewProduct(p)}
                            >
                              <GalleryVertical className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-semibold text-base min-w-0 break-words">{p.name}</h3>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(p.price)}</p>
                            <p className="text-xs text-muted-foreground">{p.brand}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1">
                              <Package className="size-3.5" />
                              {p.inventoryCount ?? 0}
                            </span>
                            {p.sku && (
                              <span className="inline-flex items-center gap-1">
                                <Barcode className="size-3.5" />
                                <span className="truncate max-w-[120px]">{p.sku}</span>
                              </span>
                            )}
                          </div>
                          <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                            <Checkbox
                              checked={!!compare[p.id]}
                              onCheckedChange={() => toggleCompare(p.id)}
                              aria-label="Compare product"
                            />
                            <span>Compare</span>
                          </label>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {computed.items.map((p) => (
                    <article key={p.id} className="flex flex-col sm:flex-row gap-4 p-4">
                      {isAdmin && (
                        <div className="flex items-start">
                          <Checkbox
                            aria-label="Select product"
                            checked={!!selected[p.id]}
                            onCheckedChange={(v) => toggleSelect(p.id, Boolean(v))}
                          />
                        </div>
                      )}
                      <div className="relative w-full sm:w-40 shrink-0 overflow-hidden rounded-md border border-border">
                        <img
                          src={p.image || FALLBACK_IMG}
                          alt={p.name}
                          className="w-full h-full object-cover aspect-square"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2">
                          {p.inStock === false || (p.inventoryCount ?? 0) <= 0 ? (
                            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">
                              Out of stock
                            </Badge>
                          ) : p.inventoryCount && p.inventoryCount < 5 ? (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                              Low stock
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold break-words">{p.name}</h3>
                            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                              {p.brand && <span>{p.brand}</span>}
                              {p.category && <span className="inline-block px-2 py-0.5 rounded-full bg-secondary">{p.category}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">{formatCurrency(p.price)}</p>
                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-2 mt-1">
                              <Package className="size-3.5" />
                              {p.inventoryCount ?? 0}
                              {p.sku && (
                                <>
                                  <Barcode className="size-3.5" />
                                  <span className="truncate max-w-[120px]">{p.sku}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {p.description && (
                          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAddToCart(p)}>
                              <PackagePlus className="mr-2 size-4" />
                              Add to cart
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setQuickViewProduct(p)}>
                              <GalleryVertical className="mr-2 size-4" />
                              Quick view
                            </Button>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-sm">
                              <Checkbox
                                checked={!!compare[p.id]}
                                onCheckedChange={() => toggleCompare(p.id)}
                              />
                              <span>Compare</span>
                            </label>
                            <Button
                              size="sm"
                              variant={wishlist[p.id] ? "default" : "outline"}
                              onClick={() => toggleWishlist(p)}
                            >
                              <QrCode className="mr-2 size-4" />
                              {wishlist[p.id] ? "Wishlisted" : "Wishlist"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {computed.totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {computed.currentPage} of {computed.totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canPrev}
                      onClick={() => canPrev && setPage((p) => p - 1)}
                    >
                      Prev
                    </Button>
                    {Array.from({ length: computed.totalPages }).slice(0, 5).map((_, idx) => {
                      const n = idx + 1;
                      return (
                        <Button
                          key={n}
                          variant={computed.currentPage === n ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </Button>
                      );
                    })}
                    {computed.totalPages > 5 && (
                      <>
                        <Button variant="ghost" size="sm" disabled>
                          ...
                        </Button>
                        <Button
                          variant={computed.currentPage === computed.totalPages ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setPage(computed.totalPages)}
                        >
                          {computed.totalPages}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canNext}
                      onClick={() => canNext && setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {compareIds.length > 0 && (
        <div className="mt-4 rounded-[var(--radius)] border border-border bg-card shadow-sm p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ChevronsRightLeft className="size-4" />
              <p className="font-medium">Compare</p>
              <Badge variant="secondary">{compareIds.length} selected</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompare({});
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (onCompare) onCompare(compareIds);
                  toast.success("Comparison ready");
                }}
              >
                Compare now
              </Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products
              .filter((p) => compare[p.id])
              .slice(0, 4)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-md border border-border bg-secondary">
                  <img
                    src={p.image || FALLBACK_IMG}
                    alt={p.name}
                    className="size-12 rounded object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(p.price)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => toggleCompare(p.id)}
                    aria-label="Remove from compare"
                  >
                    <Check className="size-4 rotate-45" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick view modal */}
      <Dialog open={!!quickViewProduct} onOpenChange={(open) => !open && setQuickViewProduct(null)}>
        <DialogContent className="max-w-3xl">
          {quickViewProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-4">
                  <span className="truncate">{quickViewProduct.name}</span>
                  <span className="text-base font-semibold">{formatCurrency(quickViewProduct.price)}</span>
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {quickViewProduct.brand} {quickViewProduct.category ? `• ${quickViewProduct.category}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative overflow-hidden rounded-md border border-border">
                  <img
                    src={quickViewProduct.image || FALLBACK_IMG}
                    alt={quickViewProduct.name}
                    className="w-full h-full object-cover max-h-[360px]"
                  />
                </div>
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {quickViewProduct.sku && (
                        <span className="inline-flex items-center gap-1">
                          <Barcode className="size-4" />
                          {quickViewProduct.sku}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Package className="size-4" />
                        {quickViewProduct.inventoryCount ?? 0} in inventory
                      </span>
                    </div>
                    {quickViewProduct.description && (
                      <p className="mt-3 text-foreground/80">{quickViewProduct.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={() => handleAddToCart(quickViewProduct)}>
                      <PackagePlus className="mr-2 size-4" />
                      Add to cart
                    </Button>
                    <Button
                      variant={wishlist[quickViewProduct.id] ? "default" : "outline"}
                      onClick={() => toggleWishlist(quickViewProduct)}
                    >
                      <QrCode className="mr-2 size-4" />
                      {wishlist[quickViewProduct.id] ? "Wishlisted" : "Wishlist"}
                    </Button>
                    <Button
                      variant={compare[quickViewProduct.id] ? "default" : "secondary"}
                      onClick={() => toggleCompare(quickViewProduct.id)}
                    >
                      <ChevronsRightLeft className="mr-2 size-4" />
                      {compare[quickViewProduct.id] ? "In compare" : "Compare"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}