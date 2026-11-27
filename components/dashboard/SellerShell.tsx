'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
// Shared with the customer store, so the "rip-theme" preference carries across the whole site.
import { ThemeToggle, useCustomerTheme } from '@/components/store/theme-toggle';
import './seller-theme.css';

const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/matches', label: 'Matches' },
  { href: '/logistics', label: 'Routes' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/verification', label: 'Verification' },
  { href: '/delivery', label: 'Delivery' },
  { href: '/store', label: 'Storefront' },
] as const;

export function SellerShell({ children }: { children: ReactNode }) {
  const theme = useCustomerTheme();
  const pathname = usePathname();

  return (
    <div className="rip-seller" data-theme={theme}>
      <div className="rip-seller-topbar">
        Seller workspace <span>Fewer miles. Shorter journeys. Verified returns, locally rerouted.</span>
      </div>
      <header className="rip-seller-header">
        <Link href="/dashboard" className="rip-seller-logo" aria-label="RIP seller workspace home">
          RIP<span>↻</span>
          <small>Seller</small>
        </Link>
        <nav className="rip-seller-nav" aria-label="Seller navigation">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}
