"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseUrl, searchParams = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `${baseUrl}?${params.toString()}`;
  }

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <div className="text-sm text-surface-400">
        Page {currentPage} sur {totalPages}
      </div>
      <div className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={buildUrl(currentPage - 1)}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 text-surface-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        ) : (
          <div className="p-2 text-surface-300 dark:text-surface-600 cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />
          </div>
        )}

        {pages.map((page, i) =>
          page === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-surface-400 text-sm">...</span>
          ) : (
            <Link
              key={page}
              href={buildUrl(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                page === currentPage
                  ? "bg-brand-600 text-white"
                  : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-white/5"
              }`}
            >
              {page}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link
            href={buildUrl(currentPage + 1)}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 text-surface-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="p-2 text-surface-300 dark:text-surface-600 cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
