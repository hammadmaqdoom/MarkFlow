"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
}

const WorkspaceContext = createContext<WorkspaceData | null>(null);

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: WorkspaceData | null;
  children: ReactNode;
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceData | null {
  return useContext(WorkspaceContext);
}
