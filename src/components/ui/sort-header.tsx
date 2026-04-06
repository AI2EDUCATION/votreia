"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface SortHeaderProps {
  label: string;
  field: string;
  basePath: string;
}

export function SortHeader({ label, field, basePath }: SortHeaderProps) {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort");
  const currentDir = searchParams.get("dir") ?? "desc";

  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";

  const params = new URLSearchParams(searchParams.toString());
  params.set("sort", field);
  params.set("dir", isActive ? nextDir : "desc");
  params.delete("page"); // reset page on sort change

  return (
    <Link
      href={`${basePath}?${params.toString()}`}
      className="flex items-center gap-1 hover:text-surface-700 dark:hover:text-surface-200 transition-colors group"
    >
      {label}
      {isActive ? (
        currentDir === "desc" ? (
          <ArrowDown className="w-3 h-3 text-brand-500" />
        ) : (
          <ArrowUp className="w-3 h-3 text-brand-500" />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      )}
    </Link>
  );
}
