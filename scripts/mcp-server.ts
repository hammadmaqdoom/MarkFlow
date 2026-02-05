/**
 * Markflow MCP server (stdio) – for use when you run the server locally.
 * Prefer the remote HTTP endpoint when your app is on Vercel: https://your-app.vercel.app/api/mcp
 *
 * Run: DOCMGMT_URL=https://your-app.com DOCMGMT_API_KEY=mf_xxx npx tsx scripts/mcp-server.ts
 */

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../src/server/trpc/root";
import type { MarkflowMcpCaller } from "../src/server/mcp/caller-type";
import { registerMarkflowTools, MCP_INSTRUCTIONS } from "../src/server/mcp/register-tools";
// @ts-expect-error SDK subpath - resolved at runtime via package exports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
// @ts-expect-error SDK subpath - resolved at runtime via package exports
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const baseUrl = process.env.DOCMGMT_URL ?? "http://localhost:3000";
const apiKey = process.env.DOCMGMT_API_KEY;

function getTrpcClient() {
  if (!apiKey?.startsWith("mf_")) {
    throw new Error(
      "Missing or invalid DOCMGMT_API_KEY. Set it to an API key from your Markflow account (Settings > API keys)."
    );
  }
  return createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${baseUrl.replace(/\/$/, "")}/api/trpc`,
        headers: () => ({ Authorization: `Bearer ${apiKey}` }),
      }),
    ],
  });
}

let trpc: ReturnType<typeof createTRPCProxyClient<AppRouter>> | undefined;
function api(): MarkflowMcpCaller {
  trpc = trpc ?? getTrpcClient();
  return trpc as unknown as MarkflowMcpCaller;
}

const mcpServer = new McpServer(
  { name: "markflow", version: "1.0.0" },
  { capabilities: {}, instructions: MCP_INSTRUCTIONS }
);
registerMarkflowTools(mcpServer, api());

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("Markflow MCP server (stdio) running. Prefer https://your-app.vercel.app/api/mcp when on Vercel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
