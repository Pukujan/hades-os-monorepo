# Handoff #013 - GIF Media Verification, Chat Rendering, and 500 Diagnostics

Date: 2026-06-17

## Goal

Make Hades/Hermes media output reliable across Discord and the Hades UI chat:

- Do not send broken/unavailable GIF embeds.
- Prefer direct media URLs, not provider landing pages.
- Render verified GIF/media attachments in the UI chat.
- Preserve useful diagnostics when `/api/hades/chat/general` returns HTTP 500 in production.

User-reported production symptom:

```text
hades-os-monorepo-production.up.railway.app/api/hades/chat/general:1
Failed to load resource: the server responded with a status of 500 ()
```

User-provided broken media example to keep as a regression fixture:

```text
https://media1.tenor.com/m/-DoRykX0LwcAAAAd/anime-girl-dark-hair.gif
```

## New TDD Commands

Run all new media/chat reliability contracts:

```bash
npm run test:hades-gif-media-reliability
```

Backend only:

```bash
npm --prefix backend run test:hades-media-verification
```

Frontend only:

```bash
npm --prefix frontend run test:hades-chat-media-ui
```

## New/Updated Tests

Backend:

- `backend/src/modules/hades/tests/unit/mediaUrlVerifier.tdd.test.js`
- `backend/src/modules/hades/tests/unit/discordGifMediaVerification.tdd.test.js`
- `backend/src/modules/hades/tests/unit/giphyProvider.test.js`

Frontend:

- `frontend/src/modules/hades/tests/unit/ChatBubble.test.js`
- `frontend/src/modules/hades/tests/unit/hadesViewModel.logic.test.js`
- `frontend/src/modules/hades/tests/unit/sendChat.test.js`

Scripts:

- Root `package.json`: `test:hades-gif-media-reliability`
- Backend `package.json`: `test:hades-media-verification`
- Frontend `package.json`: `test:hades-chat-media-ui`

## Expected Initial Red State

The tests are expected to fail until implementation is added.

Observed red run on 2026-06-17:

```text
npm run test:hades-gif-media-reliability
Backend: 5 pass, 6 fail
```

Backend failing requirements:

- Missing `mediaUrlVerifier.js` export.
- Unavailable Tenor URL is still sent to Discord instead of being rejected.
- Verified media delivery does not persist `mediaVerification`.
- Giphy provider still returns the provider landing page URL.

Frontend was run separately because the root command stops after backend failure:

```text
npm --prefix frontend run test:hades-chat-media-ui
Frontend: 26 pass, 3 fail
```

Frontend failing requirements:

- `ChatBubble` does not render `data-testid="chat-gif"` for verified GIF media.
- `ChatBubble` does not show a rejected-media fallback.
- `sendGeneralChat`/API client errors do not expose `error.status`, `error.code`, or `error.requestId`.

Expected backend failures:

- Missing `backend/src/modules/hades/services/mediaUrlVerifier.js`
- `createDiscordHermesCommandFlow` does not accept/use `mediaVerifier`
- Rejected media is still passed to `discordClient.sendMessage`
- Outbound delivery does not record `mediaVerification`
- `createGiphyProvider().searchGif()` returns `gif.url`, which is often a Giphy landing page, instead of `gif.images.original.url`

Expected frontend failures:

- `ChatBubble` does not render verified GIF/media attachments.
- `ChatBubble` does not show a safe fallback for rejected media.
- API client errors do not preserve `status`, `code`, and `requestId` on HTTP 500.

## Backend Contract

### `mediaUrlVerifier`

Create:

```text
backend/src/modules/hades/services/mediaUrlVerifier.js
```

Export:

```js
export function createMediaUrlVerifier({ fetch } = {}) {
  return {
    async verifyMediaUrl({ url, allowedContentTypes, timeoutMs }) {}
  };
}
```

Required behavior:

- Reject non-HTTPS URLs with `reason: "non_https_url"`.
- Use `HEAD` first with a short timeout.
- Accept only configured image content types, especially `image/gif`, `image/webp`, `image/png`, and `image/jpeg`.
- If response content type is HTML, read a small body sample and reject content-unavailable pages with `reason: "content_unavailable"`.
- Reject non-image content with `reason: "unsupported_content_type"`.
- Reject 404/5xx/unreachable URLs with stable reasons such as `http_error` or `network_error`.
- Return a normalized object, not a thrown error, for normal verification failures:

```js
{ ok: true, url, contentType }
{ ok: false, url, reason }
```

### Giphy Provider

Update `createGiphyProvider().searchGif()` to return a direct media URL:

Priority:

1. `gif.images.original.url`
2. `gif.images.downsized.url`
3. `gif.images.fixed_height.url`

Return shape:

```js
{
  id,
  url: "https://media.giphy.com/media/.../giphy.gif",
  providerPageUrl: gif.url,
  title
}
```

Do not use `gif.url` as the sendable media URL unless there is absolutely no image URL available, and even then it must pass the verifier before use.

### Discord Command Flow

Update:

```text
backend/src/modules/hades/services/discordHermesCommandFlow.service.js
```

Inject `mediaVerifier`:

```js
createDiscordHermesCommandFlow({ ..., mediaVerifier })
```

Required behavior:

- When a GIF action is selected, call `gifProvider.searchGif`.
- Verify the returned `gif.url` before sending to Discord.
- If verification passes, send `gifUrl`.
- If verification fails, send the message without `gifUrl` and append a short fallback such as: `I found a GIF, but the media link was unavailable, so I did not embed it.`
- Save outbound delivery with:

```js
mediaVerification: { ok: true, url, contentType }
```

or:

```js
mediaVerification: { ok: false, url, reason }
```

- Never persist or send an unverified/broken `gifUrl`.

## Frontend Contract

### Chat Bubble GIF Rendering

Update:

```text
frontend/src/modules/hades/components/ChatBubble.js
```

Required behavior:

- If `message.gifUrl` or `message.mediaUrl` exists and `message.mediaVerificationStatus === "verified"`, render an image:

```html
<img data-testid="chat-gif" src="..." alt="..." />
```

- Use `message.mediaAlt` when provided.
- If `mediaVerificationStatus === "rejected"`, do not render the image; show a compact fallback message such as `GIF unavailable`.
- Keep the current Markdown/actions/cards behavior.

### Message Normalization

Ensure API responses preserve:

```js
gifUrl
mediaUrl
mediaType
mediaAlt
mediaVerificationStatus
mediaVerificationReason
```

These fields should survive `normalizeMessage()`, `HadesPrototypeApp` response mapping, and any later chat state updates.

### Production 500 Diagnostics

Update:

```text
frontend/src/shared/api/client.js
```

When `parseResponse()` receives a failed response:

- Throw an `Error` with `status`.
- Preserve `code` from JSON response body.
- Preserve `requestId` from JSON response body.
- Preserve a useful message including either server `message` or `HTTP 500`.

Expected shape:

```js
const error = new Error("Hermes runtime crashed while generating the reply. (HTTP 500)");
error.status = 500;
error.code = "hades_chat_runtime_failed";
error.requestId = "railway-request-500";
throw error;
```

This makes the UI able to show a useful failure state and makes Railway production logs easier to correlate.

## Build Order

1. Implement `mediaUrlVerifier`.
2. Update Giphy provider direct media selection.
3. Inject/use `mediaVerifier` in Discord Hermes command flow.
4. Persist `mediaVerification` on outbound delivery.
5. Update `ChatBubble` media rendering and rejected-media fallback.
6. Ensure chat response mapping preserves media fields.
7. Update API client error objects for HTTP 500 diagnostics.
8. Run `npm run test:hades-gif-media-reliability`.
9. Then run existing relevant suites:

```bash
npm run test:hades-discord-gif-contract
npm run test:hades-runtime-contracts
npm run test:hades-extension-install
```

## Notes

- Treat the Tenor URL above as a regression fixture for content-unavailable media. A `.gif` suffix is not enough to trust a media URL.
- Discord embeds should only receive verified direct media links.
- UI chat should only render media that the backend has verified, or that the frontend can clearly mark as verified from trusted backend metadata.
- Do not solve the production 500 by hiding it. Preserve diagnostics and then inspect Railway logs/env during the implementation pass to find the root backend crash.
