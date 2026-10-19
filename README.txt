# Warieebi School Portal — Netlify serverless bundle

This package keeps the existing school portal UI and moves shared records to Netlify Blobs through Netlify Functions. It does not use Supabase.

## Admin login — no Netlify environment variables

For the requested no-environment-variable setup, the current admin login is:
- Username: `admin`
- Password: `Law123`

You do not need to add `ADMIN_PASSWORD` or `SESSION_SECRET` in Netlify settings for this version. However, the password and session signing secret are hardcoded in the serverless function source. Use a **private GitHub repository** and understand this is less secure than using Netlify environment variables. Do not use this setup for highly sensitive student information without improving the authentication and access controls.

## Deploy

1. Upload these files to a GitHub repository: `index.html`, `netlify.toml`, `package.json`, and the entire `netlify/functions/` folder.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. You do not need to add admin-password environment variables for this version.
4. Deploy. Open the deployed site and test student admission, admin login, score entry, result publishing, and result checking from a second device.

Netlify Functions routes:
- `/api/login`
- `/api/state`
- `/api/admission`
- `/api/result` (checks and consumes one access code)

## Storage and limitations

Netlify Blobs is shared online storage, so records can be accessed from multiple devices using the same deployed site. It is key/value/object storage, not a relational school database. This starter stores the school data in one state object; for a very large school, frequent concurrent edits, or sensitive/high-volume records, use a database designed for that scale and set up backups. Keep student information private, and do not publish the repository's secrets.

The UI retains local browser caching as a fallback, but online synchronization requires the deployed Netlify Functions. A successful UI action should be verified on another device after deployment.
