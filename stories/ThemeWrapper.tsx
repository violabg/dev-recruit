import React from "react";

export const ThemeWrapper = ({
  children,
  theme = "light",
}: {
  children: React.ReactNode;
  theme?: "light" | "dark";
}) => {
  return (
    <div
      className={`${theme} min-h-dvh bg-background text-foreground transition-colors `}
    >
      <div className="p-8">{children}</div>
    </div>
  );
};

export default ThemeWrapper;
