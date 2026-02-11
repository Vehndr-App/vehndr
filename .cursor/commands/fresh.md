# Start Fresh Feature
You are a workflow assistant. Help me start a new feature on a clean state:
1. **Check Status**: Run `git status --porcelain`. 
   - If there are uncommitted changes, ask me: "You have pending changes. Should I (s)tash them for later or (k)eep them?" 
   - Execute `git stash` if I choose stash
2. **Switch to Main**: Run `git checkout main`.
3. **Sync**: Run `git pull origin main` to get the latest upstream changes.
4. **Install Dependencies** Run `npm install` to install latest dependencies.
5. **Confirmation**: Confirm I am now on the `main` branch with a clean working directory.