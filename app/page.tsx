"use client";

import { useState, useEffect, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const CATEGORIES = ["All", "Electronics", "Clothing", "Shoes", "Books", "Bags", "Drinks"];

const CAT_COLORS: Record<string, string> = {
  Electronics: "#378ADD",
  Clothing: "#639922",
  Shoes: "#BA7517",
  Books: "#7F77DD",
  Bags: "#D4537E",
  Drinks: "#1D9E75",
};

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

interface CursorEntry {
  id: number;
  updatedAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // cursorStack[i] = cursor needed TO FETCH page i
  // page 0 needs null (no cursor)
  // page 1 needs the nextCursor returned from page 0 fetch
  const cursorStack = useRef<(CursorEntry | null)[]>([null]);

  const fetchPage = async (pageIndex: number, cat: string) => {
    setLoading(true);
    setError("");
    setProducts([]);

    try {
      const cursor = cursorStack.current[pageIndex] ?? null;

      const body: Record<string, unknown> = { limit: 20 };
      if (cat) body.category = cat;
      if (cursor) {
        body.cursorId = cursor.id;
        body.cursorUpdatedAt = cursor.updatedAt;
      }

      const res = await fetch(`${API_URL}/api/v1/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      setProducts(data.data);
      setHasMore(data.hasMore);
      setCurrentPage(pageIndex);

      // Save the nextCursor for the NEXT page
      if (data.nextCursor && !cursorStack.current[pageIndex + 1]) {
        cursorStack.current[pageIndex + 1] = data.nextCursor;
      }
    } catch {
      setError("Cannot connect to backend. Make sure server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPage(0, "");
  }, []);

  const handleCategoryChange = (cat: string) => {
    const newCat = cat === "All" ? "" : cat;
    setCategory(newCat);
    // Reset cursor stack for new category
    cursorStack.current = [null];
    setCurrentPage(0);
    fetchPage(0, newCat);
  };

  const handleNext = () => fetchPage(currentPage + 1, category);
  const handlePrev = () => fetchPage(currentPage - 1, category);

  const pageNumber = currentPage + 1;
  const hasPrev = currentPage > 0;
  const activeLabel = category || "All";

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f0f0f] border-b border-[#1f1f1f]">
        <div className="px-6 pt-5 pb-0 flex items-center justify-between">
          <h1 className="text-base font-medium">Products</h1>
          <span className="text-xs text-[#444] font-mono">page {pageNumber}</span>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-0 px-6 mt-4 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const isActive = cat === activeLabel;
            const color = CAT_COLORS[cat] || "#555";
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-sm whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? "text-white border-white"
                    : "text-[#555] border-transparent hover:text-[#999]"
                }`}
              >
                {cat !== "All" && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: color }}
                  />
                )}
                {cat}
              </button>
            );
          })}
        </div>
      </header>

      <main className="p-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Page", value: pageNumber },
            { label: "Category", value: activeLabel },
            { label: "Has more", value: loading ? "..." : hasMore ? "Yes" : "No" },
          ].map((s) => (
            <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3">
              <p className="text-[10px] text-[#444] uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-xl font-mono font-medium">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-16 text-[#e24b4a] text-sm">{error}</div>
        )}

        {/* Products Grid */}
        {!error && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mb-6">
            {loading
              ? Array(20).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg h-[90px] animate-pulse"
                  />
                ))
              : products.map((p) => {
                  const color = CAT_COLORS[p.category] || "#888";
                  return (
                    <div
                      key={p.id}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4 hover:border-[#333] transition-colors"
                    >
                      <p className="text-[11px] text-[#555] font-mono mb-1">#{p.id}</p>
                      <p className="text-sm font-medium text-white mb-3 leading-snug">{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] text-[#666]">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          {p.category}
                        </span>
                        <span className="text-sm font-mono font-medium">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  );
                })}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20 text-[#444] text-sm">
            No products in {activeLabel}
          </div>
        )}

        {/* Prev / Next */}
        {!error && (
          <div className="flex items-center justify-between pt-2 pb-10">
            <button
              onClick={handlePrev}
              disabled={!hasPrev || loading}
              className="flex items-center gap-2 px-5 py-2 border border-[#2a2a2a] rounded-md text-sm text-[#666] hover:text-white hover:border-[#444] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <span className="text-xs text-[#444] font-mono">Page {pageNumber}</span>

            <button
              onClick={handleNext}
              disabled={!hasMore || loading}
              className="flex items-center gap-2 px-5 py-2 border border-[#2a2a2a] rounded-md text-sm text-[#666] hover:text-white hover:border-[#444] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}