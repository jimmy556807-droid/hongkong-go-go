<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Light rail logic lives in src/lib/lrt.functions.ts + src/components/LrtPanel.tsx, separate from MTR heavy-rail code — LRT uses different stop IDs/APIs (MTR opendata CSV + lrt/getSchedule).
