import { router } from "./trpc";
import { documentRouter } from "./routers/document";
import { githubRouter } from "./routers/github";
import { projectRouter } from "./routers/project";
import { templateRouter } from "./routers/template";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  document: documentRouter,
  template: templateRouter,
  github: githubRouter,
});

export type AppRouter = typeof appRouter;
