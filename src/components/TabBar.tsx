"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  { href: "/sami", label: "Sami" },
  { href: "/explore", label: "探索" },
  { href: "/me", label: "我的" },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-around h-14 border-t border-card-border bg-background safe-bottom shrink-0">
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex items-center justify-center h-full"
          >
            {active ? (
              <span className="px-6 py-2 rounded-[20px] bg-foreground text-white text-sm font-bold">
                {tab.label}
              </span>
            ) : (
              <span className="text-sm text-muted">{tab.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
