This project uses a Node.js backend (`server.js`) to handle file operations (saving projects, loading files from the local filesystem). Standard static hosting (like uploading HTML/JS files to a `public_html` folder) will **NOT** work for the Project Manager features because:

1.  **Node.js Dependency**: The logic for saving/loading projects, creating folders, and verifying paths resides in `server.js`, which requires a Node.js environment to run.
2.  **File System Access**: Browsers cannot directly access the server's file system to write files (save projects) without a backend API.

### How to Deploy on Hostinger (VPS or Cloud Hosting)

If you have a **VPS** plan on Hostinger, you can deploy this app:

1.  **Upload Files**: Upload all project files to the server.
2.  **Install Node.js**: Ensure Node.js is installed on your VPS.
3.  **Install Dependencies**: Run `npm install` in the project directory (ensure `package.json` exists with `express`, `cors` dependencies).
4.  **Start Server**: Run `node server.js` (or use a process manager like PM2: `pm2 start server.js`).
5.  **Reverse Proxy**: Configure Nginx or Apache to proxy traffic from port 80/443 to the Node.js port (3000).

### How to Deploy on Shared Hosting (Standard Web Hosting)

If you are on standard **Shared Hosting**, you cannot run `server.js`. You have two options:

**Option A: Disable Project Manager (Static Only)**
You can use the app as a purely static analyzer, but you will **lose** the ability to Save/Load projects to the server.
- The "Load Data" -> "Upload Files" feature will still work (since it's browser-based).
- The "Project" features (Save/Load Project) will fail because the API endpoints won't exist.

**Option B: Switch Backend**
Rewrite the backend logic in **PHP**, which is supported by shared hosting. You would need to create PHP scripts (e.g., `api/save.php`, `api/load.php`) that replicate the functionality of `server.js`.
