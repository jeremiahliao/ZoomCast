import type { ReactNode } from "react";
import { NavBar } from "./NavBar";

interface PageLayoutProps {
  children?: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-6 py-8">{children}</main>
    </>
  );
}
