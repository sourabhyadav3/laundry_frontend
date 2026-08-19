# Local Development & Deployment Guide

## 1. Prerequisites
To install and run SpinClean PRO locally, ensure the following tools are installed:
* **Node.js:** v18.x or v20.x (Recommended LTS releases)
* **Package Manager:** npm (v9.x or later, bundled with Node.js)
* **Terminal Interface:** PowerShell, Bash, or Command Prompt

---

## 2. Installation & Quick Start

### 2.1 Fetch Dependencies
Navigate to the project root directory and install dependencies listed in `package.json`:
```bash
npm install
```

### 2.2 Launch Development Server
Start the client-side dev server. The application automatically triggers compilation and mounts locally:
```bash
npm start
```
* **Local Access Address:** [http://localhost:3000](http://localhost:3000)
* **Hot Reloading:** Enabled by default. Making edits to JSX, CSS, or JS modules triggers automatic re-compilation and refreshes browser tabs.

---

## 3. Project Build & Bundling

To bundle the application for production environments (compiling, optimizing, and minifying files into static assets):
```bash
npm run build
```
This script compiles assets and outputs them to the `/build` directory:
- `/build/static/js/`: Minified JavaScript chunks.
- `/build/static/css/`: Postprocessed Tailwind and custom CSS styles.
- `/build/index.html`: Bootstrapped single-page application entry point.

---

## 4. Environment Configurations
Prepare a `.env` file in the project's root folder to govern feature flags and endpoint mapping once backend integration is complete:

```ini
# Environment settings file
REACT_APP_API_URL=https://api.spincleanpro.com/v1
REACT_APP_MOCK_MODE=false
REACT_APP_VERSION=v2.4.0
```

---

## 5. Cloud Deployment Options
Since the application compiles into static HTML/CSS/JS assets, it can be served using static site hosts or content delivery networks:

### 5.1 Deployment on Vercel
1. Install the Vercel CLI: `npm install -g vercel`
2. Run command: `vercel`
3. Link project, select directory, and specify build command: `npm run build` and output folder: `build`.

### 5.2 Deployment on Netlify
1. Create a new site from Git or compile locally and drag the `/build` directory into the Netlify Dashboard.
2. Build Settings:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `build`
   - **Redirect Rule (for React Router support):** Configure a `_redirects` file in public containing:
     ```text
     /*   /index.html   200
     ```

### 5.3 Deployment on AWS S3 & CloudFront
1. Create an Amazon S3 Bucket and enable "Static Website Hosting".
2. Sync the `/build` directory content to the bucket:
   ```bash
   aws s3 sync build/ s3://spinclean-pro-bucket --delete
   ```
3. Set up a CloudFront Distribution mapping to the S3 bucket to enforce SSL/TLS, and override error pages (redirecting 404 to `/index.html` with response code 200) to support React client-side routing.
