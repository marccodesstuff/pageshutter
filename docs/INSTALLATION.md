# Installation Guide

Complete guide to set up the development environment for the Screenshot Capture Tool.

---

## System Requirements

Before you start, ensure your system meets these requirements:

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | 22.0.0+ | JavaScript runtime |
| **npm** | 10.9.2+ | Package manager |
| **Git** | Any recent | Version control |
| **OS** | macOS, Linux, or Windows | Any decent development machine |

### Checking Your Versions

```shell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

If any are below the required version, upgrade first:

- **Node.js:** [nodejs.org](https://nodejs.org/) — download and install LTS version
- **npm:** `npm install -g npm`
- **Git:** [git-scm.com](https://git-scm.com/)

---

## Step 1: Clone the Repository

```shell
git clone https://github.com/your-username/workers-template.git
cd workers-template
```

If you haven't forked the repo, you can also clone directly:

```shell
# Clone (if you don't have a fork)
git clone https://github.com/notion-screenshot-worker/workers-template.git
cd workers-template
```

---

## Step 2: Install Dependencies

```shell
npm install
```

This will:
- Read `package.json`
- Download dependencies to `node_modules/`
- Create a lock file (`package-lock.json`)

**Expected output:**
```
added X packages, and audited Y packages in Zs
```

**Verify installation:**
```shell
npm ls
```

You should see:
- `@notionhq/workers` (the main SDK)
- `typescript`
- Other dev dependencies

---

## Step 3: Verify the Setup

### Type-Check the Code

```shell
npm run check
```

This validates TypeScript without building. If there are no errors, you're good.

**Expected output:**
```
(no output = success)
```

### Build the Project

```shell
npm run build
```

This compiles TypeScript to JavaScript.

**Expected output:**
```
(no output = success)

# Check that dist/ was created:
ls -la dist/
# Should show: dist/index.js
```

---

## Step 4: Set Up Environment Variables (Local Development)

For local testing, you need BrowserStack credentials in a `.env` file.

### Create `.env` File

In the project root:

```shell
cat > .env << 'EOF'
BROWSERSTACK_USERNAME=your_username_here
BROWSERSTACK_ACCESS_KEY=your_access_key_here
EOF
```

Or manually create `.env` and add:

```
BROWSERSTACK_USERNAME=your_username_here
BROWSERSTACK_ACCESS_KEY=your_access_key_here
```

### Get Your Credentials

1. Log in to [BrowserStack](https://www.browserstack.com/)
2. Go to [Settings → Account](https://www.browserstack.com/accounts/settings)
3. Copy your **Username** and **Access Key**
4. Paste them into `.env`

### Keep `.env` Secure

**IMPORTANT:** `.env` is in `.gitignore` by default. Never commit it to Git.

```shell
# Verify .env is not tracked:
git status

# Should NOT show .env
```

---

## Step 5: Install the Notion CLI

```shell
npm install -g ntn
```

This installs the `ntn` command globally so you can use it from anywhere.

**Verify installation:**
```shell
ntn --version
```

---

## Development Workflow

Now that everything is set up, here's your typical development workflow:

### 1. Make Code Changes

Edit `src/index.ts` with your changes.

### 2. Type-Check

```shell
npm run check
```

Catches TypeScript errors early.

### 3. Build

```shell
npm run build
```

Compiles TypeScript to JavaScript.

### 4. Test Locally

```shell
# Requires .env file with BrowserStack credentials
ntn workers exec captureScreenshot --local -d '{"url": "https://example.com"}'
```

This runs the tool on your machine using your local credentials.

**Expected output:**
```
Successfully captured screenshot. You can view it here: https://cdn.browserstack.com/screenshots/...
```

### 5. Check Logs

If something fails, check what went wrong:

```shell
# View the last run (local execution)
ntn workers runs logs

# Or get a specific run ID
ntn workers runs list
ntn workers runs logs <runId>
```

### 6. Deploy (When Ready)

```shell
# Make sure to store credentials on Notion's servers first:
ntn workers env set BROWSERSTACK_USERNAME=your_username
ntn workers env set BROWSERSTACK_ACCESS_KEY=your_access_key

# Then deploy:
ntn workers deploy
```

---

## Useful npm Commands

### List All Available Scripts

```shell
npm run
```

Output:
```
available scripts:
  build        tsc
  check        tsc --noEmit
```

### Run TypeScript in Watch Mode (Advanced)

Install globally:
```shell
npm install -g tsx
```

Then run in watch mode:
```shell
npx tsx watch src/index.ts
```

This re-runs your code every time you save, useful for rapid iteration.

---

## IDE Setup (Recommended)

### VS Code

1. Install [VS Code](https://code.visualstudio.com/)
2. Install extensions:
   - **TypeScript Vue Plugin** (official)
   - **ESLint** (optional but recommended)
3. Open the project folder
4. VS Code should auto-detect TypeScript and show errors in real-time

### IntelliJ IDEA / WebStorm

1. Open the project folder
2. Select `package.json` as the project root
3. IDE auto-detects Node.js and TypeScript
4. No additional configuration needed

### vim / Neovim

1. Install LSP client (e.g., `vim-lsp`, `coc.nvim`, or `neovim` built-in LSP)
2. Install TypeScript language server: `npm install -g typescript-language-server`
3. Point LSP client to your project's TypeScript

---

## Troubleshooting Installation

### Issue: `node: command not found`

**Cause:** Node.js not installed or not in PATH

**Solution:**
1. Download [Node.js LTS](https://nodejs.org/)
2. Run the installer
3. Restart your terminal
4. Verify: `node --version`

### Issue: `npm install` fails with network errors

**Cause:** Network connectivity issue or npm registry problem

**Solution:**
```shell
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

Or use a different npm registry:
```shell
npm install --registry https://registry.npmjs.org/
```

### Issue: Permission denied errors during installation

**Cause:** npm trying to write to system directories

**Solution:**
```shell
# Fix npm permissions (macOS/Linux only)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH

# Then try again
npm install
```

### Issue: TypeScript compile errors

**Cause:** Mismatched TypeScript versions or syntax errors

**Solution:**
```shell
# Reinstall TypeScript specifically
npm install --save-dev typescript@latest

# Try building again
npm run build
```

### Issue: `ntn: command not found`

**Cause:** CLI not installed globally or not in PATH

**Solution:**
```shell
# Install globally
npm install -g ntn

# Restart terminal and verify
ntn --version
```

---

## Project Structure

Once installed, your project should look like this:

```
workers-template/
├── src/
│   └── index.ts              # Main tool code
├── dist/                      # Compiled JavaScript (created by npm run build)
│   └── index.js
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md
│   ├── API_REFERENCE.md
│   ├── DEPLOYMENT.md
│   ├── BROWSERSTACK_API.md
│   ├── DEVELOPMENT.md
│   ├── INSTALLATION.md
│   ├── TROUBLESHOOTING.md
│   └── FAQ.md
├── node_modules/             # Dependencies (created by npm install)
├── .git/                      # Git repository
├── .gitignore                 # Git ignore rules
├── package.json               # Project metadata
├── package-lock.json          # Locked dependency versions
├── tsconfig.json              # TypeScript configuration
├── README.md                  # Main documentation
└── LICENSE.md                 # License
```

---

## Next Steps

Now that your environment is set up:

1. **Read the Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Understand the API:** [API_REFERENCE.md](API_REFERENCE.md)
3. **Start developing:** [DEVELOPMENT.md](DEVELOPMENT.md)
4. **Deploy:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Getting Help

### Documentation

- [Architecture](ARCHITECTURE.md) — System design
- [API Reference](API_REFERENCE.md) — Tool specification
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
- [FAQ](FAQ.md) — Frequently asked questions

### External Resources

- [Notion Workers SDK](https://www.notion.so/) — Official documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/) — TypeScript guide
- [npm Documentation](https://docs.npmjs.com/) — npm help
- [BrowserStack API Docs](https://www.browserstack.com/docs/screenshots/api) — BrowserStack guide

---

## Related Documentation

- [Development Guide](DEVELOPMENT.md) — Making code changes
- [Deployment Guide](DEPLOYMENT.md) — Deploying to production
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
