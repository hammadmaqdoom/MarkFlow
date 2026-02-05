import { createCallerFactory } from "@trpc/server";
import { createContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/root";
import { registerMarkflowTools, MCP_INSTRUCTIONS } from "@/server/mcp/register-tools";
import type { MarkflowMcpCaller } from "@/server/mcp/caller-type";

// MCP SDK – Web Standard transport for Request/Response (Vercel/serverless)
// @ts-expect-error SDK subpath - resolved at runtime via package exports
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
// @ts-expect-error SDK subpath - resolved at runtime via package exports
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

async function handleMcpRequest(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing or invalid Authorization header. Use Bearer <API_KEY>." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const ctx = await createContext({
    req: request,
    resHeaders: new Headers(),
  });

  if (!ctx.user) {
    return new Response(
      JSON.stringify({ error: "Invalid API key. Create one in the app: API keys." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const createCaller = createCallerFactory()(appRouter);
  const trpcCaller = createCaller(ctx);

  const caller: MarkflowMcpCaller = {
    workspace: { list: () => trpcCaller.workspace.list() },
    project: { list: (x) => trpcCaller.project.list(x) },
    document: {
      list: (x) => trpcCaller.document.list(x),
      getById: (x) => trpcCaller.document.getById(x),
      getByPath: (x) => trpcCaller.document.getByPath(x),
      updateContent: (x) => trpcCaller.document.updateContent(x),
      create: (x) => trpcCaller.document.create(x),
    },
  };

  const server = new McpServer(
    { name: "markflow", version: "1.0.0" },
    { capabilities: {}, instructions: MCP_INSTRUCTIONS }
  );
  registerMarkflowTools(server, caller);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless – works with Vercel serverless
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);
  return response;
}
