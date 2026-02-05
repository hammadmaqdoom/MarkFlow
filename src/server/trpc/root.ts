import { router } from "./trpc";
import { commentRouter } from "./routers/comment";
import { documentRouter } from "./routers/document";
import { documentationRouter } from "./routers/documentation";
import { githubRouter } from "./routers/github";
import { projectRouter } from "./routers/project";
import { projectSpecRouter } from "./routers/projectSpec";
import { shareLinkRouter } from "./routers/shareLink";
import { templateRouter } from "./routers/template";
import { userRouter } from "./routers/user";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = router({
  user: userRouter,
  workspace: workspaceRouter,
  project: projectRouter,
  document: documentRouter,
  documentation: documentationRouter,
  projectSpec: projectSpecRouter,
  comment: commentRouter,
  template: templateRouter,
  github: githubRouter,
  shareLink: shareLinkRouter,
});

export type AppRouter = typeof appRouter;
