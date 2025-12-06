# gitshine ✨

Shine up your git commits — Interactive CLI to edit commit messages.

> ⚠️ **Designed for personal/solo projects only.** This tool rewrites git history. Do not use on shared or collaborative repositories without understanding the implications.

## Features

- 📋 **Interactive commit list** - Browse through recent commits with author and date info
- ✏️ **Inline editing** - Edit commit messages directly in the terminal (no editor popup)
- 🔄 **Automatic rebase** - Handles git rebase complexity under the hood
- 🌱 **Root commit support** - Can even edit the very first commit
- ⚠️ **Safety checks** - Warns about uncommitted changes and in-progress rebases
- 🎨 **Beautiful CLI** - Colorful, user-friendly interface

## Installation

```bash
npm install -g gitshine
```

## Usage

Navigate to any git repository and run:

```bash
gitshine
```

### Options

| Option | Description |
|--------|-------------|
| `-n, --number <count>` | Number of commits to display (default: 20) |
| `-a, --all` | Show all commits |
| `-V, --version` | Show version number |
| `-h, --help` | Show help |

```bash
# Show last 20 commits (default)
gitshine

# Show last 50 commits
gitshine -n 50

# Show all commits
gitshine -a
```

## Example

```
$ gitshine

✨ gitshine - Shine Up Your Git Commits

? Select a commit to edit: (Use arrow keys)
❯ abc1234 Fix login bug (John, 2 hours ago)
  def5678 Add user authentication (John, 5 hours ago)
  ghi9012 Initial commit (John, 1 day ago)
  ──────────────
  Cancel

Current commit message:
  "Fix login bug"

? Enter new commit message: Fix login validation for empty passwords

New commit message:
  "Fix login validation for empty passwords"

? Are you sure you want to edit this commit message? This will rewrite history. Yes
✔ Commit message edited successfully!

To undo: git reset --hard abc1234

Note: If this branch has been pushed, you will need to force push:
  git push --force-with-lease
```

## ⚠️ Important: When to Use This Tool

### ✅ Good Use Cases
- Personal projects
- Solo repositories  
- Local commits not yet pushed
- Learning/experimental repos
- Fixing typos before pushing

### ❌ Bad Use Cases
- Shared team repositories
- Open source projects with contributors
- Commits already pushed to remote (unless you're the only contributor)
- Production/company projects

## How It Works

Under the hood, the tool:
1. Checks out the target commit in detached HEAD
2. Amends the commit message
3. Rebases all subsequent commits on top
4. Updates your branch to the new history

This is equivalent to doing `git rebase -i` and marking a commit for `reword`, but without the manual steps.

## Prerequisites

- **Node.js**
- **Git**
- **No uncommitted changes**
- **No rebase in progress**

## Troubleshooting

### "You have uncommitted changes"

```bash
git stash        # Stash changes
gitshine         # Edit commit messages
git stash pop    # Restore changes
```

### "A rebase is already in progress"

```bash
git rebase --abort   # Cancel ongoing rebase
```

### Undo a change

After editing, gitshine shows you the undo command:

```
✔ Commit message edited successfully!

To undo: git reset --hard abc1234
```

Just run the command shown to restore your previous state.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © [Pushkaraj Kulkarni](https://github.com/thepushkaraj)
