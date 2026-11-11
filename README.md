# Individual-InDebth-study
DM helper to run and track sessions

## Setup

```sh
cd my-app
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

`.env` needs:

| Variable      | Description |
|---------------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB`  | Database name |
| `JWT_SECRET`  | Random string, at least 32 characters. Generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

These are server-only secrets. Never commit `.env`, and never give secrets a `VITE_` prefix (Vite exposes those to the browser).

Production build: `npm run build`, then run it with these two variables set:

```sh
ORIGIN=https://your-domain.example BODY_SIZE_LIMIT=6M node build
```

Both are read by `@sveltejs/adapter-node` and are not needed for `npm run dev`:

- `ORIGIN`: the public URL of the site. Without it SvelteKit's CSRF protection rejects form and file uploads with 403.
- `BODY_SIZE_LIMIT`: the default is 512 KB, which is smaller than the 5 MB allowed for scene map images. Set it to `6M` or uploads above 512 KB are rejected.
