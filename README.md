# Audiohub Source Studio

A static, browser-based builder for creating independent JSON source manifests for Audiohub.

## Features
- Audio, debrid, ebook, and book-metadata source templates
- GET/POST request configuration, headers and JSON body templates
- Response result-path and field mapping
- Live API testing from the browser
- JSON preview, clipboard copy, and `.json` download
- No account, AI service, or database required

## Important schema note
This project creates its own versioned format: `audiohub.source.v1`. It is **not automatically compatible with Audiohub's current source loader** until Audiohub implements an adapter for this schema. The generated file is a well-formed configuration manifest, not a universal plugin. Confirm the runtime contract in the Audiohub app before relying on exported sources.

## Run locally
Open `index.html` in a modern browser, or run a local static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy to Cloudflare Pages (static, no build step)
1. Create a GitHub repository, for example `audiohub-source-studio`.
2. Upload `index.html`, `styles.css`, `app.js`, `_headers`, and this README to the repository root.
3. In Cloudflare Dashboard, open **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
4. Choose the repository.
5. Framework preset: **None**.
6. Build command: leave blank.
7. Build output directory: `/` (repository root).
8. Deploy. Cloudflare will give you a `*.pages.dev` URL.

Alternatively, use Cloudflare Pages direct upload with the project folder, if available in your dashboard.

## Live API testing and CORS
The included tester uses browser `fetch`. An API must allow cross-origin requests from your deployed site or the browser will block access. CORS is a browser security policy; it is not fixed by adding `mode: "no-cors"` because that makes the response unreadable.

For providers that officially permit server-side API use, a separate Cloudflare Worker proxy can be added. Before exposing one publicly, restrict it to a short allowlist of trusted hostnames, validate the URL and HTTP method, apply rate limits, and keep credentials in Cloudflare Worker secrets. Do not deploy an unrestricted open proxy. The app intentionally does not include a public proxy endpoint by default.

## Security and lawful use
- Use official APIs and sources you have permission to access.
- Do not embed passwords, API keys, session cookies, or private account tokens in exported JSON or client-side code.
- For authenticated services, implement a provider-specific server-side integration using Cloudflare secrets and the provider's terms.
- A debrid template is only a configuration example; it does not access any account until integrated with the provider's official API.

## Manifest example
```json
{
  "schema": "audiohub.source.v1",
  "id": "public-audio-catalogue",
  "name": "Public Audio Catalogue",
  "type": "audio",
  "description": "Search a lawful audiobook catalogue.",
  "request": {
    "url": "https://api.example.org/search?q={{query}}",
    "method": "GET",
    "responseFormat": "json",
    "headers": {}
  },
  "search": {
    "queryToken": "{{query}}"
  },
  "response": {
    "resultsPath": "results",
    "fields": {
      "title": "title",
      "author": "author",
      "mediaUrl": "audio_url",
      "coverUrl": "cover_url",
      "id": "id",
      "size": "duration"
    }
  },
  "security": {
    "credentials": "Do not embed private credentials in exported manifests; use a secure proxy or runtime secret."
  }
}
```
