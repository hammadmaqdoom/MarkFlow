declare module "turndown" {
  interface TurndownServiceOptions {
    headingStyle?: "setext" | "atx";
  }

  class TurndownService {
    constructor(options?: TurndownServiceOptions);
    turndown(html: string | Node): string;
  }

  export default TurndownService;
}
