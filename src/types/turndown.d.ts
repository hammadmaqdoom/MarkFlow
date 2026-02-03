declare module "turndown" {
  interface TurndownServiceOptions {
    headingStyle?: "setext" | "atx";
  }

  class TurndownService {
    constructor(options?: TurndownServiceOptions);
    turndown(html: string | Node): string;
    use(plugin: (service: TurndownService) => void): void;
  }

  export default TurndownService;
}
