import type { SupabaseClient } from "@supabase/supabase-js";
import { pathFromParentAndName, normalizePath } from "@/server/lib/path";
import {
  type DomainId,
  DOMAIN_IDS,
  getDomainFolderName,
  getDomainDocSlugs,
} from "@/server/lib/domains";
import { getAiProvider, type AiProviderId } from "./index";
import { getSystemPrompt, getUserPrompt } from "./prompts";
import type { ConceptInput, DomainOverrides } from "./prompts";

export interface OrchestratorInput {
  supabase: SupabaseClient;
  projectId: string;
  userId: string;
  providerId: AiProviderId;
  domains: DomainId[];
  conceptInput: ConceptInput;
  domainOverrides?: DomainOverrides;
}

export interface GeneratedDocResult {
  documentId: string;
  path: string;
  domainId: DomainId;
  created: boolean;
}

/** Find or create a folder document by path (e.g. "Compliance") at project root */
async function getOrCreateFolder(
  supabase: SupabaseClient,
  projectId: string,
  folderPath: string
): Promise<{ id: string }> {
  const path = normalizePath(folderPath);
  const { data: existing } = await supabase
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("path", path)
    .eq("type", "folder")
    .maybeSingle();
  if (existing) return { id: existing.id };
  const name = path.split("/").pop() ?? path;
  const { data: inserted, error } = await supabase
    .from("documents")
    .insert({
      project_id: projectId,
      parent_id: null,
      type: "folder",
      name,
      path,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      const { data: retry } = await supabase
        .from("documents")
        .select("id")
        .eq("project_id", projectId)
        .eq("path", path)
        .single();
      if (retry) return { id: retry.id };
    }
    throw new Error(`Failed to create folder ${path}: ${error.message}`);
  }
  return { id: inserted!.id };
}

/** Snapshot current content to document_versions before overwrite */
async function snapshotToVersion(
  supabase: SupabaseClient,
  documentId: string,
  contentMd: string | null,
  userId: string
): Promise<void> {
  const { data: last } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNum = (last?.version_number ?? 0) + 1;
  await supabase.from("document_versions").insert({
    document_id: documentId,
    content_md: contentMd ?? null,
    content_yjs: null,
    version_number: nextNum,
    created_by: userId,
  });
}

export async function runDocumentationOrchestrator(
  input: OrchestratorInput
): Promise<GeneratedDocResult[]> {
  const {
    supabase,
    projectId,
    userId,
    providerId,
    domains,
    conceptInput,
    domainOverrides,
  } = input;

  const provider = getAiProvider(providerId);
  if (!provider.isConfigured()) {
    throw new Error(`AI provider "${providerId}" is not configured (missing API key)`);
  }

  const results: GeneratedDocResult[] = [];
  const domainList = domains.length > 0 ? domains : [...DOMAIN_IDS];

  for (const domainId of domainList) {
    const folderName = getDomainFolderName(domainId);
    const folderPath = folderName;
    const { id: folderId } = await getOrCreateFolder(supabase, projectId, folderPath);
    const docSlugs = getDomainDocSlugs(domainId);

    for (const docSlug of docSlugs) {
      const docPath = pathFromParentAndName(folderPath, docSlug);
      const { data: existingDoc } = await supabase
        .from("documents")
        .select("id, content_md")
        .eq("project_id", projectId)
        .eq("path", docPath)
        .maybeSingle();

      const systemPrompt = getSystemPrompt(domainId);
      const userPrompt = getUserPrompt(
        domainId,
        docSlug,
        conceptInput,
        domainOverrides
      );
      const content = await provider.generate({ systemPrompt, userPrompt });

      if (existingDoc) {
        await snapshotToVersion(
          supabase,
          existingDoc.id,
          (existingDoc as { content_md: string | null }).content_md ?? null,
          userId
        );
        await supabase
          .from("documents")
          .update({ content_md: content })
          .eq("id", existingDoc.id);
        results.push({
          documentId: existingDoc.id,
          path: docPath,
          domainId,
          created: false,
        });
      } else {
        const { data: newDoc, error } = await supabase
          .from("documents")
          .insert({
            project_id: projectId,
            parent_id: folderId,
            type: "file",
            name: docSlug,
            path: docPath,
            content_md: content,
          })
          .select("id")
          .single();
        if (error) throw new Error(`Failed to create doc ${docPath}: ${error.message}`);
        results.push({
          documentId: newDoc!.id,
          path: docPath,
          domainId,
          created: true,
        });
      }
    }
  }

  return results;
}
