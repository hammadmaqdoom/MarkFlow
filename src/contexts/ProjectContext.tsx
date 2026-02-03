"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface ProjectData {
  id: string;
  name: string;
  slug: string;
  workspaceId: string;
}

const ProjectContext = createContext<ProjectData | null>(null);

export function ProjectProvider({
  project,
  children,
}: {
  project: ProjectData | null;
  children: ReactNode;
}) {
  return (
    <ProjectContext.Provider value={project}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectData | null {
  return useContext(ProjectContext);
}
