// @ts-nocheck
import React from 'react';
import {
  SignedIn,
  SignedOut,
  UserButton,
  useClerk,
  useUser,
} from '@clerk/clerk-react';
import { Menu as MenuIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, MenuProps } from 'antd';
import { useHeader } from '../context/HeaderContext';
import { BRAND, BrandLockup } from './Brand';
import { Button } from './ui/button';

/**
 * Plimsoll header — sticky, glass, hairline.
 *
 * Design notes (per `designprompt.md` §1):
 *  - 64px tall, `backdrop-blur-xl` over the page surface.
 *  - Brand mark (gradient ring) + Plimsoll wordmark, tight tracking.
 *  - Pill nav: active item = subtle accent fill, others = ghost.
 *  - No more Microsoft-blue (#0078d4); the only color signal is the
 *    accent gradient, which we reserve for the gradient CTA only.
 *  - On the demo page, the header collapses to give the cockpit
 *    breathing room — the wordmark hides, only the mark stays.
 */
export const CommonHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openSignIn } = useClerk();
  const { user } = useUser();
  const { subtitle, extraContent } = useHeader();

  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const whitelistStr = process.env.NEXT_PUBLIC_ADMIN_WHITELIST || '';
  const adminWhitelist = whitelistStr
    .split(',')
    .map((e: string) => e.trim().toLowerCase());

  const isAdmin =
    user?.publicMetadata?.role === 'admin' ||
    (userEmail && adminWhitelist.includes(userEmail));

  const isDemoPage = location.pathname === '/demo';

  type NavLink = { path: string; label: string };
  const navLinks: NavLink[] = [
    { path: '/usershome', label: 'Cockpit' },
    { path: '/documents', label: 'Documents' },
    { path: '/demo', label: 'Demo' },
    { path: '/pay', label: 'Pricing' },
  ];

  const adminMenuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      label: 'Admin dashboard',
      onClick: () => navigate('/admin'),
    },
    {
      key: 'customers',
      label: 'Tenants',
      onClick: () => navigate('/admin'),
    },
    { key: 'ai-logs', label: 'Agent traces', disabled: true },
    { type: 'divider' },
    { key: 'settings', label: 'Settings', disabled: true },
  ];

  return (
    <header
      className={
        'sticky top-0 z-50 w-full border-b border-[var(--line)] ' +
        'bg-[rgba(10,10,11,0.72)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(10,10,11,0.55)] ' +
        'transition-all'
      }
      style={{ height: isDemoPage ? 64 : 60 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <BrandLockup
            size={26}
            showWordmark={!isDemoPage}
            onClick={() => navigate('/pay')}
            className="shrink-0"
          />

          {/* Pill nav */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {navLinks.map((link) => {
              const active = location.pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={
                    'px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.005em] transition-colors ' +
                    (active
                      ? 'bg-[rgba(124,58,237,0.14)] text-[var(--accent-1)] border border-[rgba(167,139,250,0.30)]'
                      : 'text-[var(--text-mid)] hover:text-[var(--text-hi)] border border-transparent hover:border-[var(--line)]')
                  }
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {isDemoPage && subtitle && (
            <div className="hidden lg:flex flex-col min-w-0 ml-2 pl-4 border-l border-[var(--line)]">
              <p className="m-0 text-[10.5px] font-mono uppercase tracking-[0.12em] text-[var(--text-low)]">
                Crisis Cockpit
              </p>
              <p
                className="m-0 text-[12px] leading-tight text-[var(--text-mid)] truncate max-w-[420px]"
                title={subtitle}
              >
                {subtitle}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {isDemoPage && extraContent}

          <SignedIn>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Dropdown
                  menu={{ items: adminMenuItems }}
                  placement="bottomRight"
                  arrow
                >
                  <button
                    aria-label="Admin menu"
                    className="flex items-center justify-center size-8 rounded-full text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                  >
                    <MenuIcon className="size-4" strokeWidth={2} />
                  </button>
                </Dropdown>
              )}
              <UserButton afterSignOutUrl="/pay" />
            </div>
          </SignedIn>

          <SignedOut>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => openSignIn()}
              aria-label={`Sign in to ${BRAND.short}`}
            >
              Sign in
            </Button>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};
