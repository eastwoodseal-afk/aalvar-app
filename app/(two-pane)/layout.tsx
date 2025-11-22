"use client";

import { ReactNode } from "react";
import Header from "../../components/Header";

export default function TwoPaneLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <div style={{ height: "calc(100vh - 64px)" }}>
        {children}
      </div>
    </div>
  );
}
