'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ComponentProps } from 'react';

// 1. Define the type for the function pattern
type ClassNameFn = (props: { isActive: boolean }) => string;

// 2. Extend the standard Next.js Link props
interface NavLinkProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  children: React.ReactNode;
  className?: string | ClassNameFn; // Allow string OR function
  end?: boolean; // Allow the 'end' prop for exact matching
}

export default function NavLink({
  href,
  children,
  className,
  end = false,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const hrefPath = typeof href === 'object' ? href.pathname : href;

  // 3. Determine if active
  // If 'end' is true (or href is '/'), do exact match. 
  // Otherwise allow partial match (e.g. /parties/123 matches /parties)
  const isActive = (pathname === hrefPath) || 
                   (!end && pathname.startsWith(hrefPath as string) && hrefPath !== '/');

  // 4. Resolve the className
  // If it's a function, run it with the active state. If it's a string, just use it.
  const resolvedClassName = typeof className === 'function'
    ? className({ isActive })
    : className;

  return (
    <Link href={href} className={resolvedClassName} {...props}>
      {children}
    </Link>
  );
}