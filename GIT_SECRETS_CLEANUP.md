# Removing Committed Secrets from Git History

If you find any sensitive files (e.g. `.vercel/auth.json`, `.env` with secrets, service account keys) committed in the repository history, follow these steps to remove them and rotate credentials.

Important: History rewrites are destructive and affect all collaborators and downstream clones. Coordinate with your team and perform the rewrite only when ready.

Recommended steps

1. Add offending paths to `.gitignore` and commit that change so future commits won't include them.

2. Rotate any secrets that were exposed immediately in the provider dashboards (Vercel/GCP/AWS/Supabase, etc.). This is the highest priority.

3. Remove the file from the current commit history locally and rewrite history using one of the tools below:
   - Preferred: `git filter-repo` (faster and safer)
     - Example: `git filter-repo --invert-paths --path .vercel/auth.json`
   - Alternative: BFG Repo-Cleaner
     - Example: `bfg --delete-files .vercel/auth.json` then follow BFG instructions to clean refs and reflogs.
   - Legacy: `git filter-branch` (not recommended for large repos)

4. Force-push the rewritten history to the remote:
   - `git push --force --all`
   - `git push --force --tags`

5. Inform collaborators to re-clone the repository or run recovery steps (the rewrite changes commit IDs).

6. Ensure the removed file is present in `.gitignore` and not re-committed.

7. Verify there are no remaining copies of keys in CI artifacts or in provider dashboards; rotate keys again if needed.

If you need help performing this in your repository or want me to generate the exact `git filter-repo` commands for the files you specify, tell me which files need removal and I will prepare the commands.