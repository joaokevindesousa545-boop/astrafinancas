<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Astra Finanças UI lives verbatim in public/astra.html (original vanilla app); src/lib/astra-runtime.ts provides its `window.claude` db/user API on Lovable Cloud (`docs` table keyed by path) — keep the original file intact so the look matches exactly.

## Design standard (all screens, all projects)

Visual direction is **Liquid Glass / glassmorphism** (Apple iOS style). Any new or
edited screen must follow it:

- Frosted translucent glass panels: `backdrop-filter: blur(18px) saturate(1.6)` over a
  soft gradient; never flat solid fills for buttons, cards, dialogs or toasts.
- Very rounded corners (18–30px), soft low-contrast shadows, thin light inner rim on edges.
- Buttons show **icon only, no text label**, whenever the meaning is obvious. Add a text
  label only where an icon would be ambiguous.
- Clean typography, generous spacing, premium iOS feel; no generic default fonts, no
  purple/indigo gradients on white, no hard-coded color utilities that bypass the theme.
- Bottom navigation pill for main sections; keep the month capsule small and centered.

## Editing rules for outside agents (Codex and similar)

- The app's whole UI is the single file `public/astra.html`. Make changes there; do not
  rewrite it from scratch, split it into components, or restyle it in React.
- Do not edit `src/integrations/supabase/*`, `src/routeTree.gen.ts`, `.env`, or anything
  under `supabase/migrations/` — Lovable generates those.
- Do not add database tables or change the schema; ask Lovable to do it.
- Keep the app in Portuguese (pt-BR) and keep the existing color tokens and CSS variables.
- Push small, focused commits to the synced branch so the change lands back in Lovable.
