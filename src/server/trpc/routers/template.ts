import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../trpc";

const TEMPLATES: Record<
  string,
  { name: string; description?: string; content: string }
> = {
  blank: {
    name: "Blank",
    description: "Start with an empty document",
    content: "",
  },
  prd: {
    name: "Product Requirements Document",
    description: "Structured PRD template for product specs",
    content: `# Product Requirements Document

## Overview
**Product name:** 
**Owner:** 
**Last updated:** 

## Problem statement
What problem does this solve?

## Goals
- 
- 

## Non-goals
- 

## User stories
1. As a [user], I want [action] so that [outcome].
2. 

## Requirements
### Must have
- 

### Should have
- 

### Could have
- 

## Success metrics
- 

## Timeline & milestones
| Milestone | Target |
|-----------|--------|
| | |

## Open questions
- 

## Appendix
`,
  },
  "meeting-notes": {
    name: "Meeting Notes",
    description: "Template for capturing meeting outcomes",
    content: `# Meeting Notes

**Date:** 
**Attendees:** 
**Facilitator:** 

## Agenda
1. 
2. 

## Discussion
### Topic 1


### Topic 2


## Decisions
- 

## Action items
| Owner | Action | Due |
|-------|--------|-----|
| | | |

## Next steps
- 
`,
  },
  okr: {
    name: "OKR",
    description: "Objectives and key results with progress tracking",
    content: `# OKR

**Period:** 
**Owner:** 

## Objective 1
- 

### Key results
- [ ] 
- [ ] 
- [ ] 

## Objective 2
- 

### Key results
- [ ] 
- [ ] 

## Objective 3
- 

### Key results
- [ ] 
`,
  },
  "investor-update": {
    name: "Investor Update",
    description: "Monthly investor update template",
    content: `# Investor Update

**Month:** 
**Company:** 

## Highlights
- 
- 

## Metrics
| Metric | This month | Last month | Change |
|--------|------------|------------|--------|
| | | | |

## Asks
- 

## Timeline
| Milestone | Target |
|-----------|--------|
| | |

## Notes
`,
  },
  "decision-log": {
    name: "Decision Log",
    description: "Record decisions with context and outcome",
    content: `# Decision Log

## Decision 1
**Date:** 
**Decision:** 

**Context:** 

**Options considered:**
- 
- 

**Outcome:** 

**Owner:** 

---

## Decision 2
**Date:** 
**Decision:** 

**Context:** 

**Options considered:**
- 
- 

**Outcome:** 

**Owner:** 
`,
  },
};

const ALLOWED_SLUGS = Object.keys(TEMPLATES);

/** Returns template markdown content by slug, or null if slug is unknown. Used when creating docs from template. */
export function getTemplateContent(slug: string): string | null {
  const t = TEMPLATES[slug];
  return t ? t.content : null;
}

export const templateRouter = router({
  list: publicProcedure.query(() => {
    return ALLOWED_SLUGS.map((slug) => {
      const t = TEMPLATES[slug]!;
      return { slug, name: t.name, description: t.description };
    });
  }),

  getContent: publicProcedure
    .input(z.object({ slug: z.string().min(1).max(100) }))
    .query(({ input }) => {
      if (!ALLOWED_SLUGS.includes(input.slug)) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }
      return TEMPLATES[input.slug]!.content;
    }),
});
