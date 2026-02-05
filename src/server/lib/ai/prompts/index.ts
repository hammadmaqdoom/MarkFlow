/**
 * Prompt templates per department and document.
 * Builds system + user prompts from concept_input and optional department_overrides.
 */

import type { DepartmentId } from "@/server/lib/departments";
import {
  getDepartmentFolderName,
  getDepartmentDocSlugs,
} from "@/server/lib/departments";

export interface ConceptInput {
  idea?: string;
  audience?: string;
  goals?: string;
  context?: string;
  productType?: string;
  [key: string]: unknown;
}

export interface DepartmentOverrides {
  [departmentId: string]: string | undefined;
}

const CONCEPT_SUMMARY = (c: ConceptInput) =>
  [
    c.idea && `**Idea:** ${c.idea}`,
    c.audience && `**Audience:** ${c.audience}`,
    c.goals && `**Goals:** ${c.goals}`,
    c.context && `**Context:** ${c.context}`,
    c.productType && `**Product type:** ${c.productType}`,
  ]
    .filter(Boolean)
    .join("\n");

/** System prompt per department (role + style) */
export function getSystemPrompt(departmentId: DepartmentId): string {
  const base =
    "You are an expert documentation writer. Output only valid markdown. No preamble or explanation—just the document content.";
  const roles: Record<DepartmentId, string> = {
    compliance:
      "You specialize in compliance and regulatory documentation. Be precise and reference standards where relevant.",
    product:
      "You specialize in product strategy, competitive analysis, and product requirements. Be clear and actionable.",
    design:
      "You specialize in design systems, UX strategy, and brand. Include concrete examples and visual language.",
    marketing:
      "You specialize in brand, go-to-market, SEO, and AI-assisted content strategy. Be specific and campaign-ready.",
    technical:
      "You specialize in system architecture, APIs, database design, and software requirements. Be precise and implementable.",
  };
  return `${base} ${roles[departmentId]}`;
}

/** User prompt for a specific document: concept + doc instructions */
export function getUserPrompt(
  departmentId: DepartmentId,
  docSlug: string,
  conceptInput: ConceptInput,
  departmentOverrides?: DepartmentOverrides
): string {
  const concept = CONCEPT_SUMMARY(conceptInput);
  const override = departmentOverrides?.[departmentId];
  const overrideBlock = override ? `\n**Additional context for this department:**\n${override}\n` : "";

  const docInstructions: Record<string, string> = {
    "compliance-overview.md": `Create a Compliance Overview document. Sections: Introduction, Relevant standards/regulations, Key compliance requirements, Risk areas, Checklist summary.`,
    "competitive-landscape.md": `Create a Competitive Landscape document. Sections: Market overview, Key competitors (table or list), Differentiation, SWOT, Recommendations.`,
    "detailed-specifications.md": `Create Detailed Specifications. Sections: Feature list, Functional specs, Edge cases, Dependencies.`,
    "features-prd.md": `Create a Features PRD. Sections: Feature name, Description, Acceptance criteria, Priority, Effort.`,
    "product-strategy.md": `Create a Product Strategy document. Sections: Vision, Target market, Roadmap phases, Success metrics.`,
    "user-stories.md": `Create User Stories. Format: As a [role], I want [action] so that [benefit]. Include acceptance criteria for each.`,
    "ui-wireframes.md": `Create a UI Wireframes spec. Describe key screens, layout, components, and interactions in markdown (no images).`,
    "ux-strategy.md": `Create a UX Strategy. Sections: User research summary, Personas, Journey map, Principles, Key flows.`,
    "brand-colours.md": `Create a Brand Colours document. Define primary, secondary, accent colours (hex); usage guidelines; contrast notes.`,
    "design-system.md": `Create a Design System doc. Typography, spacing, components, patterns. Reference brand colours.`,
    "brand-positioning.md": `Create Brand Positioning. Sections: Value proposition, Positioning statement, Messaging pillars, Tone.`,
    "go-to-market.md": `Create a Go-To-Market document. Sections: Target segments, Channels, Launch plan, Metrics.`,
    "brand-voice.md": `Create Brand Voice guidelines. Voice attributes, Do's and Don'ts, Examples.`,
    "brand-guidelines.md": `Create Brand Guidelines. Logo usage, typography, imagery, applications.`,
    "seo-strategy.md": `Create an SEO Strategy. Keywords, on-page, technical SEO, content plan.`,
    "llm-ai-seo.md": `Create an LLM/AI SEO document. How to optimize for AI answers (e.g. featured snippets, structured data, E-E-A-T).`,
    "system-architecture.md": `Create a System Architecture document. High-level diagram (mermaid or text), components, data flow, deployment.`,
    "api-specifications-backend.md": `Create API Specifications for the backend. List endpoints (method, path, request/response), auth, errors.`,
    "db-design-structure.md": `Create a Database Design document. Tables, columns, relationships (ER or mermaid), indexes.`,
    "software-requirements-specification.md": `Create a Software Requirements Specification (SRS). Functional and non-functional requirements, use cases, constraints.`,
  };

  const instructions =
    docInstructions[docSlug] ??
    `Create a comprehensive markdown document for "${docSlug}" based on the project concept. Use clear headings and structure.`;

  return `## Project concept\n\n${concept}${overrideBlock}\n## Task\n\n${instructions}`;
}
