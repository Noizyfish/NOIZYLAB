# AI fix

When `cf-watch` or `redteam` fails, the `ai-fix` workflow (`.github/workflows/ai-fix.yml`) runs
`scripts/ai-fix/ai_fix.mjs`, which:

1. pulls the failed-step logs with `gh run view --log-failed`;
2. attaches the workflow file and any repo files the log mentions;
3. asks a model for a root cause, a fix, and a unified diff;
4. publishes the diagnosis to the job summary and as an artifact;
5. if the diff only touches the files it was shown **and** passes `git apply --check`, pushes
   `ai-fix/<run-id>` and opens a pull request. Nothing is ever merged automatically.

Model: GitHub Models (`openai/gpt-4.1`, free with `GITHUB_TOKEN`; change with repo variable
`AI_FIX_MODEL`). Set the `ANTHROPIC_API_KEY` secret to use Claude instead. `HALT_URL` is honoured.

Manual: `node scripts/ai-fix/ai_fix.mjs --run <run_id> --dry-run`, or trigger `ai-fix` from the
Actions tab with a run id. If the PR step warns, enable *Settings → Actions → General →
Allow GitHub Actions to create and approve pull requests*.
