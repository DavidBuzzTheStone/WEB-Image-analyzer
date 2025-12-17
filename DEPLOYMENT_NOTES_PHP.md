DEPLOYMENT TO HOSTINGER (PHP VERSION)

1.  **Structure on Server (public_html)**:
    -   `index.html` (Main file)
    -   `style.css`
    -   `server.js` (NOT USED, you can delete it from server)
    -   `modules/` (All JS modules: `charts.js`, `project.js`, `ui.js`, etc.)
    -   `api/` (PHP Scripts: `projects.php`, `save.php`, etc.)
    -   `projects/` (Empty folder where saved data will go. **Important**: Set permissions to 777 or 755 so PHP can write to it)

2.  **Steps**:
    -   Create a folder `projects` in your `public_html` root.
    -   Upload the `api` folder containing the PHP scripts initiated in this session.
    -   Upload the modified `modules/project.js` which points to `api/*.php`.
    -   Upload all other static files (`index.html`, `style.css`, etc).

3.  **Permissions**:
    -   Ensure the `projects` folder is writable by the web server user. If 'Save' fails, try setting permissions of `projects` folder to `777` (via Hostinger File Manager -> Right Click -> Permissions).

4.  **Testing**:
    -   Open your website URL. Load "Project" -> "Load Project". It should show an empty directory or list existing files if any.
    -   Try saving a project.

Note: Since this uses standard PHP, no Node.js server process is needed. It works on Shared Hosting.
