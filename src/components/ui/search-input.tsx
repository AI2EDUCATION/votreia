"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  basePath: string;
}

export function SearchInput({ placeholder = "Rechercher...", paramName = "q", basePath }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? "");

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(paramName, value);
      } else {
        params.delete(paramName);
      }
      // Reset to page 1 on new search
      params.delete("page");
      router.push(`${basePath}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timeout);
  }, [value, paramName, basePath, router, searchParams]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-8 w-64"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-100 dark:hover:bg-white/5 text-surface-400"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
