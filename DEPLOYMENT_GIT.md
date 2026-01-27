# How to Deploy via Git (Hostinger)

This guide explains how to set up automatic deployment so that every time you `git push`, your website updates automatically.

## 1. Prepare your Local Repository

We have already created a `.gitignore` to prevent system files and your `projects/` data from being uploaded. 

1.  **Commit your changes**:
    ```bash
    git add .
    git commit -m "Setup Git deployment configuration"
    ```

## 2. Set up GitHub/GitLab

1.  Create a **Private Repository** on GitHub (recommended).
2.  Add your local project to it:
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    git push -u origin main
    ```

## 3. Configure Hostinger hPanel

1.  Log in to your **Hostinger hPanel**.
2.  Go to **Advanced** -> **Git**.
3.  **Repository URL**: Paste your GitHub repository URL (e.g., `https://github.com/user/repo.git`).
4.  **Branch**: `main`.
5.  **Install Directory**: Leave blank if you want it in the root `public_html`.
6.  Click **Create**.

### If using a Private Repo:
Hostinger will provide an **SSH Key**. 
1.  Copy the key provided by Hostinger.
2.  Go to your GitHub Repository -> **Settings** -> **Deploy Keys** -> **Add deploy key**.
3.  Paste the key and save.

## 4. Enable Auto-Deployment (Webhooks)

To make it truly "Push-to-Deploy":
1.  In Hostinger Git settings, click **Auto-Deployment**.
2.  Copy the **Webhook URL**.
3.  Go to your GitHub Repository -> **Settings** -> **Webhooks** -> **Add webhook**.
4.  Paste the URL into **Payload URL**.
5.  Click **Add webhook**.

## 5. Important: Permissions after first deploy

The first time you deploy via Git, Hostinger might reset some permissions. 
- Ensure the `projects/` folder exists on the server.
- Ensure `projects/` has `755` or `777` permissions so your PHP scripts can still save data.

---

### Why this is better:
*   **Safety**: You can't accidentally delete files on the server.
*   **Version History**: You can "Rollback" to a previous version in one click if something breaks.
*   **Speed**: Only changed files are transferred.
