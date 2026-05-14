# Skill Registry — pro-sport

Generated: 2026-05-09

## Available Skills

| Skill | Trigger Context |
|-------|----------------|
| `frontend-design` | UI/UX design, layout, styling, Tailwind, component design |
| `vercel-react-best-practices` | React patterns, performance, SSR, component optimization |
| `clean-code` | Code review, refactoring, naming, function decomposition |
| `security-best-practices` | Auth flows, RLS, input validation, Supabase security |
| `accessibility` | ARIA, WCAG, keyboard navigation, Radix UI accessibility |
| `branch-pr` | Creating PRs, branching strategy |
| `gh-fix-ci` | CI/CD failures, build errors |
| `sentry` | Error tracking, monitoring setup |
| `seo` | Meta tags, Open Graph, page title optimization |
| `playwright` | E2E browser testing (not yet set up in this project) |
| `netlify-deploy` | Deploy to Netlify (currently on Vercel) |
| `vercel-deploy` | Deploy to Vercel |
| `linear` | Issue/ticket management in Linear |
| `issue-creation` | Creating GitHub issues |

## Compact Rules (auto-inject in sub-agents)

### React + Supabase (inject when touching /src/ files)
- Keep page components thin: logic in custom hooks, data calls in /src/lib/
- Use shadcn/ui primitives — do NOT add new UI libraries
- Server state via TanStack Query, global state via Context (auth/notifs only)
- All Supabase calls go in /src/lib/{module}/api.ts — never inline in components
- Standardize error returns: `{ data: T | null, error: string | null }` pattern
- Run `npm run typecheck` after every implementation batch

### Supabase (inject when touching /src/lib/ or /migrations/)
- Always consider RLS policies when adding new tables or columns
- Use `.maybeSingle()` for optional relations, `.single()` only when guaranteed
- Real-time subscriptions MUST have cleanup: `return () => supabase.removeChannel(channel)`
- Prefer `select()` with explicit columns over `select('*')` for performance

### UI/UX (inject when touching /src/pages/ or /src/components/)
- Mobile-first: all new pages must work on 375px width (primary device target)
- Use BottomNav for primary navigation — do NOT add sidebar patterns
- Role-aware UI: check `profile.is_cancha`, `profile.is_promoter` for conditional rendering
- Loading states: use Skeleton components, never blank screens

## Convention Files
- No CLAUDE.md at project root
- No .cursorrules found
- Config: openspec/config.yaml
