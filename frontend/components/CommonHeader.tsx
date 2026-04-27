// @ts-nocheck
"use client";
import React from 'react';
import { Menu as MenuIcon, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Dropdown, MenuProps } from 'antd';
import { useHeader } from '../context/HeaderContext';
import { useCurrentUser, useSupabaseAuth } from '../context/SupabaseAuthContext';
import { BRAND, BrandLockup } from './Brand';
import { Button } from './ui/button';

/**
 * Plimsoll header — sticky, glass, hairline.
 *
 * Design notes:
 *  - 60px tall, `backdrop-blur-xl` over the page surface.
 *  - Brand mark (gradient ring) + Plimsoll wordmark, tight tracking.
 *  - Pill nav: active item = subtle accent fill, others = ghost.
 *  - Single accent (calm blue gradient) reserved for the gradient CTA.
 *  - On the demo page, the header collapses to give the cockpit
 *    breathing room — the wordmark hides, only the mark stays.
 */
export const CommonHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname() ?? '/';
  const navigate = React.useCallback(
    (path: string) => {
      const hashIndex = path.indexOf('#');
      if (hashIndex !== -1) {
        const basePath = path.slice(0, hashIndex) || '/';
        const anchor = path.slice(hashIndex + 1);
        if (pathname === basePath) {
          const target =
            typeof document !== 'undefined' ? document.getElementById(anchor) : null;
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
      }
      router.push(path);
    },
    [router, pathname],
  );
  const { isSignedIn, email, fullName, avatarUrl, user } = useCurrentUser();
  const { signOut } = useSupabaseAuth();

  const { subtitle, extraContent } = useHeader();

  const userEmail = email?.toLowerCase();
  const whitelistStr = process.env.NEXT_PUBLIC_ADMIN_WHITELIST || '';
  const adminWhitelist = whitelistStr
    .split(',')
    .map((e: string) => e.trim().toLowerCase());

  const role =
    (user?.app_metadata as Record<string, unknown> | undefined)?.role ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.role;

  const isAdmin =
    role === 'admin' ||
    (userEmail && adminWhitelist.includes(userEmail));

  const isDemoPage = pathname === '/demo';

  type NavLink = { path: string; label: string };
  const navLinks: NavLink[] = [
    { path: '/usershome', label: 'Cockpit' },
    { path: '/documents', label: 'Documents' },
    { path: '/demo', label: 'Demo' },
    { path: '/#pricing', label: 'Pricing' },
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

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'email',
      label: <span className="font-mono text-xs text-[var(--text-low)]">{email}</span>,
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'cockpit',
      label: 'Cockpit',
      onClick: () => navigate('/usershome'),
    },
    { type: 'divider' },
    {
      key: 'sign-out',
      label: (
        <span className="flex items-center gap-2 text-[var(--danger)]">
          <LogOut className="size-3.5" /> Sign out
        </span>
      ),
      onClick: async () => {
        await signOut();
        navigate('/');
      },
    },
  ];

  const initials = (fullName || email || '?')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

  return (
    <header
      className={
        'sticky top-0 z-50 w-full border-b border-[var(--line)] ' +
        'bg-[rgba(255,255,255,0.78)] backdrop-blur-xl supports-[backdrop-filter]:bg-[rgba(255,255,255,0.62)] ' +
        'transition-all'
      }
      style={{ height: isDemoPage ? 64 : 60 }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-5 md:px-8">
        <div className="flex min-w-0 items-center gap-6">
          <BrandLockup
            size={26}
            showWordmark={!isDemoPage}
            onClick={() => navigate('/')}
            className="shrink-0"
          />

          <nav className="hidden md:flex items-center gap-1 ml-2">
            {navLinks.map((link) => {
              const active = pathname === link.path;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className={
                    'px-3.5 py-1.5 rounded-full text-[13px] font-medium tracking-[-0.005em] transition-colors ' +
                    (active
                      ? 'bg-[rgba(37,99,235,0.10)] text-[var(--accent-3)] border border-[rgba(37,99,235,0.30)]'
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

          {isSignedIn ? (
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Dropdown
                  menu={{ items: adminMenuItems }}
                  placement="bottomRight"
                  arrow
                >
                  <button
                    aria-label="Admin menu"
                    className="flex items-center justify-center size-8 rounded-full text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:bg-[rgba(37,99,235,0.06)] transition-colors"
                  >
                    <MenuIcon className="size-4" strokeWidth={2} />
                  </button>
                </Dropdown>
              )}
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <button
                  aria-label="Account menu"
                  className="flex items-center justify-center size-9 rounded-full overflow-hidden border border-[var(--line)] bg-white shadow-sm hover:border-[var(--accent-2)]/40 transition-colors"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[12px] font-semibold text-[var(--accent-3)]">
                      {initials}
                    </span>
                  )}
                </button>
              </Dropdown>
            </div>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => navigate('/sign-in')}
              aria-label={`Sign in to ${BRAND.short}`}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
