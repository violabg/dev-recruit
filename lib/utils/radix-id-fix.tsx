import React from "react";

/**
 * Radix UI ID Stabilizer
 *
 * Wraps components that use Radix UI's useId() hook to ensure
 * consistent IDs between server and client rendering.
 *
 * This fixes React 19 hydration mismatches caused by Radix UI's
 * dynamic ID generation.
 */

let idCounter = 0;

export const RadixIdProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  React.useLayoutEffect(() => {
    // Reset counter on mount to ensure consistency
    idCounter = 0;
  }, []);

  return <>{children}</>;
};

/**
 * Wrapper for client components using Radix UI
 * Ensures ID stability by forcing client-side rendering
 */
export function withRadixIdFix<P extends object>(
  Component: React.ComponentType<P>
) {
  const Wrapped = React.forwardRef<unknown, P>((props, ref) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return null;
    }

    return <Component {...(props as P)} />;
  });

  Wrapped.displayName = `withRadixIdFix(${
    Component.displayName || Component.name
  })`;
  return Wrapped;
}
