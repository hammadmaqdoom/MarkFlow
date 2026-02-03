"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface HeaderContextValue {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextValue | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  const value: HeaderContextValue = {
    content,
    setContent: useCallback((node: ReactNode) => setContent(node), []),
  };
  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeaderContent(): ReactNode {
  const ctx = useContext(HeaderContext);
  return ctx?.content ?? null;
}

export function useSetHeaderContent(): (node: ReactNode) => void {
  const ctx = useContext(HeaderContext);
  return ctx?.setContent ?? (() => {});
}
