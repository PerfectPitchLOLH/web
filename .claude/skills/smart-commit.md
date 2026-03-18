# Smart Commit Skill

Automatically analyze ALL code changes and create a single gitmoji commit.

## Execution Steps

### 1. Verify changed files are from différent new feature

You have to take car that file changed are from the same modification scope. If there is two feature created in the same time, you will have to create two differents commit.

For each commit who will be created, follow the instruction bellow.

### 1. Gather Information (run in parallel)

- `git status` - See all changes
- `git diff` - Unstaged changes
- `git diff --staged` - Staged changes
- `git log -3 --oneline` - Commit style

### 2. Determine Primary Change Type

Choose the MOST SIGNIFICANT change type:

**Gitmoji Reference:**

- ✨ New feature or significant addition
- 🐛 Bug fix
- ♻️ Code refactoring
- 💄 UI/styling changes
- ⚡️ Performance improvements
- 🔒️ Security improvements
- 🔧 Configuration changes
- 📝 Documentation
- ✅ Tests
- 🚀 Deployment/build
- 🥅 Error handling
- 🔍 SEO improvements
- 🌐 Internationalization
- ♿️ Accessibility
- 🎨 Code structure/format
- 📦 Dependencies
- 🔥 Remove code/files
- 🚧 Work in progress

### 3. Security Check

NEVER commit these files:

- `.env*` files
- `**/credentials.json`, `**/secrets.json`
- API keys, passwords, tokens
- Private keys (`.pem`, `.key`, `id_rsa`)

### 4. Stage All Files

Run: `git add .`

### 5. Create Commit

Format: `{emoji} {short description}`

**Rules:**

- Max 60 characters
- Imperative mood ("Add" not "Added")
- English only
- No period at end
- Specific but concise

**Examples:**

- ✨ Add email verification system
- 🐛 Fix session timeout issue
- ♻️ Refactor auth architecture
- 💄 Update dashboard UI
- 🔒️ Add rate limiting to API

### 6. Execute

Run: `git commit -m "{emoji} {description}"`

### 7. Verify

Run: `git status` and `git log -1 --oneline`

Report: commit hash, message, and files count

## Important Rules

- Stage ALL files automatically (except sensitive ones)
- Choose ONE emoji (the most important change)
- Keep message SHORT and clear
- Write in English
- Never use `--no-verify` or `--amend`
- If pre-commit hook fails, follow its instructions
