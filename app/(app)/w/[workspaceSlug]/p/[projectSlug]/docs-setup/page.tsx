"use client";

import { Button, Input, Label } from "@/components/ui";
import { useProject } from "@/contexts/ProjectContext";
import {
  DOMAIN_IDS,
  DOMAIN_LABELS,
  AI_PROVIDER_LABELS,
  type DomainId,
  type AiProviderId,
} from "@/lib/domains";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";

type Step = 1 | 2 | 3;

export default function DocsSetupPage() {
  const project = useProject();
  const params = useParams();
  const router = useRouter();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;

  const [step, setStep] = useState<Step>(1);
  const [idea, setIdea] = useState("");
  const [audience, setAudience] = useState("");
  const [goals, setGoals] = useState("");
  const [context, setContext] = useState("");
  const [domains, setDomains] = useState<DomainId[]>([...DOMAIN_IDS]);
  const [provider, setProvider] = useState<AiProviderId>("openai");

  const { data: spec, isLoading: specLoading } = trpc.projectSpec.get.useQuery(
    { projectId: project?.id ?? "" },
    { enabled: !!project?.id }
  );
  const { data: configuredProviders } = trpc.documentation.getConfiguredProviders.useQuery(
    undefined,
    { enabled: step === 3 }
  );
  useEffect(() => {
    if (step === 3 && configuredProviders?.length && !configuredProviders.includes(provider)) {
      setProvider(configuredProviders[0]);
    }
  }, [step, configuredProviders, provider]);

  useEffect(() => {
    if (!spec) return;
    const c = spec.conceptInput as Record<string, unknown>;
    if (typeof c?.idea === "string") setIdea(c.idea);
    if (typeof c?.audience === "string") setAudience(c.audience);
    if (typeof c?.goals === "string") setGoals(c.goals);
    if (typeof c?.context === "string") setContext(c.context);
  }, [spec]);

  const upsertSpec = trpc.projectSpec.upsert.useMutation();
  const generateDocs = trpc.documentation.generate.useMutation({
    onSuccess: () => {
      trpc.useUtils().project.getById.invalidate();
      router.push(`/w/${workspaceSlug}/p/${projectSlug}`);
    },
  });

  const handleNextFromConcept = async () => {
    if (!project?.id) return;
    await upsertSpec.mutateAsync({
      projectId: project.id,
      conceptInput: { idea, audience, goals, context },
      domainOverrides: {},
    });
    setStep(2);
  };

  const toggleDomain = (id: DomainId) => {
    setDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleSelectAllDomains = () => {
    setDomains([...DOMAIN_IDS]);
  };

  const handleGenerate = async () => {
    if (!project?.id) return;
    await generateDocs.mutateAsync({
      projectId: project.id,
      provider,
      domains: domains.length > 0 ? domains : undefined,
    });
  };

  if (!project) return null;

  const selectClassName =
    "mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/w/${workspaceSlug}/p/${projectSlug}`}
          className="text-sm text-text-muted hover:text-text"
        >
          ← Back to project
        </Link>
        <h1 className="text-2xl font-semibold text-text mt-2">
          AI documentation setup
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Describe your project concept; we’ll generate docs by domain.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="idea">What are you building?</Label>
            <textarea
              id="idea"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A B2B SaaS that helps teams manage compliance workflows"
              rows={3}
              className={selectClassName + " resize-y"}
            />
          </div>
          <div>
            <Label htmlFor="audience">Who is it for?</Label>
            <Input
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Compliance officers at mid-size companies"
            />
          </div>
          <div>
            <Label htmlFor="goals">Primary goals</Label>
            <textarea
              id="goals"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Reduce audit prep time, centralize evidence"
              rows={2}
              className={selectClassName + " resize-y"}
            />
          </div>
          <div>
            <Label htmlFor="context">Any extra context (optional)</Label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Tech stack, constraints, references..."
              rows={2}
              className={selectClassName + " resize-y"}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleNextFromConcept}
              disabled={upsertSpec.isPending || !idea.trim()}
            >
              {upsertSpec.isPending ? "Saving…" : "Next: Choose domains"}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Select which domains to generate. Default: all.
          </p>
          <button
            type="button"
            onClick={handleSelectAllDomains}
            className="text-sm text-accent hover:underline"
          >
            Select all
          </button>
          <ul className="space-y-2">
            {DOMAIN_IDS.map((id) => (
              <li key={id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`domain-${id}`}
                  checked={domains.includes(id)}
                  onChange={() => toggleDomain(id)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor={`domain-${id}`} className="text-text">
                  {DOMAIN_LABELS[id]}
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Next: Generate</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Choose an AI provider. Only configured providers are listed.
          </p>
          {specLoading || !configuredProviders ? (
            <p className="text-sm text-text-muted">Loading providers…</p>
          ) : configuredProviders.length === 0 ? (
            <p className="text-sm text-amber-600">
              No AI provider configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY,
              or GOOGLE_GENERATIVE_AI_API_KEY in your environment.
            </p>
          ) : (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as AiProviderId)}
              className={selectClassName}
            >
              {configuredProviders.map((id) => (
                <option key={id} value={id}>
                  {AI_PROVIDER_LABELS[id]}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={
                generateDocs.isPending ||
                !configuredProviders?.length ||
                domains.length === 0
              }
            >
              {generateDocs.isPending
                ? "Generating…"
                : "Generate documentation"}
            </Button>
          </div>
          {generateDocs.isError && (
            <p className="text-sm text-red-600" role="alert">
              {generateDocs.error.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
