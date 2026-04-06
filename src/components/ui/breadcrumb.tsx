import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-surface-300 dark:text-surface-600" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-surface-900 dark:text-surface-50 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
