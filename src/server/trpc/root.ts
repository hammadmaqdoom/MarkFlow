import { router } from "./trpc";
import { commentRouter } from "./routers/comment";
import { documentRouter } from "./routers/document";
import { githubRouter } from "./routers/github";
import { projectRouter } from "./routers/project";
import { shareLinkRouter } from "./routers/shareLink";
import { templateRouter } from "./routers/template";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  document: documentRouter,
  comment: commentRouter,
  template: templateRouter,
  github: githubRouter,
  shareLink: shareLinkRouter,
});

export type AppRouter = typeof appRouter;
