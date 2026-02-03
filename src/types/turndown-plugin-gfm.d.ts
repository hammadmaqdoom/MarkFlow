declare module "turndown-plugin-gfm" {
  export function gfm(service: { use: (plugin: (service: unknown) => void) => void }): void;
}
