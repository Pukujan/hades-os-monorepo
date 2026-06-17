# Handoff #016 - Inline Tenor GIF Rendering From Hermes Chat Text

Date: 2026-06-17

## Goal

Fix Hades UI chat so direct GIF URLs that Hermes writes inside assistant text render as inline GIF media, not just text/actions.

User-reported examples:

```text
https://media.tenor.com/9E6S0OziLzEAAAAC/anime-girl-anime.gif
https://media.tenor.com/MoaGff0ZE6gAAAAC/kaoruko-waguri-the-fragrant-flower-blooms-with-dignity.gif
```

## Current Likely Cause

`ChatBubble` only renders GIF media when the message has:

```js
message.gifUrl
message.mediaVerificationStatus === "verified"
```

But Hermes currently emits the Tenor URL inside `assistantMessage.content`.

The current frontend link normalizer only turns raw URLs into `external_link` actions. It does not promote direct media URLs from content into `gifUrl/mediaUrl`, and `HadesPrototypeApp` currently drops media fields from `response.assistantMessage` when building the UI message.

So the URL can be valid and direct, but still not render as a GIF because it never becomes a media attachment object.

## New TDD Commands

Run all inline GIF media contracts:

```bash
npm run test:hades-inline-gif-media
```

Backend only:

```bash
npm --prefix backend run test:hades-inline-gif-media
```

Frontend only:

```bash
npm --prefix frontend run test:hades-inline-gif-media-ui
```

## New/Updated Tests

Backend:

```text
backend/src/modules/hades/tests/unit/hermes.service.test.js
```

Frontend:

```text
frontend/src/modules/hades/tests/unit/inlineGifResponseMapping.tdd.test.js
frontend/src/modules/hades/tests/unit/ChatBubble.test.js
```

Scripts:

- Root `package.json`: `test:hades-inline-gif-media`
- Backend `package.json`: `test:hades-inline-gif-media`
- Frontend `package.json`: `test:hades-inline-gif-media-ui`

## Observed Initial Red State

Run on 2026-06-17:

```bash
npm run test:hades-inline-gif-media
```

Backend:

```text
5 pass, 1 fail
```

Failing requirement:

- `mediaVerifier.verifyMediaUrl` is never called for direct GIF URLs embedded inside Hermes assistant text.

Frontend was run separately because the root command stops after backend failure:

```bash
npm --prefix frontend run test:hades-inline-gif-media-ui
```

Frontend:

```text
9 pass, 1 fail
```

Failing requirement:

- `HadesPrototypeApp` response mapping does not preserve `assistantMessage.gifUrl` and related media fields.

Passing signal:

- `ChatBubble` already renders verified `gifUrl` media, so the main UI problem is upstream mapping/extraction.

## Backend Contract

Update:

```text
backend/src/modules/hades/services/hermes.service.js
```

Expected behavior:

1. After Hermes returns `assistantText`, scan sanitized text for direct media URLs.
2. Recognize direct GIF/image URLs, including:

```text
https://media.tenor.com/.../*.gif
https://media1.tenor.com/.../*.gif
https://media.giphy.com/.../*.gif
```

3. Verify candidates with `mediaVerifier.verifyMediaUrl`.
4. If verification passes, attach media fields to `assistantMessage`:

```js
{
  gifUrl,
  mediaUrl: gifUrl,
  mediaType: "image/gif",
  mediaAlt: "GIF media",
  mediaVerificationStatus: "verified",
  mediaVerificationReason: null
}
```

5. If verification fails, do not render a broken GIF; attach:

```js
{
  mediaVerificationStatus: "rejected",
  mediaVerificationReason: result.reason
}
```

6. Do not trust `.gif` suffix alone. Use the verifier from Handoff #013.

## Frontend Contract

Update:

```text
frontend/src/modules/hades/pages/HadesPrototypeApp.jsx
```

The assistant response mapping must preserve:

```js
gifUrl
mediaUrl
mediaType
mediaAlt
mediaVerificationStatus
mediaVerificationReason
```

Currently it maps content/actions/cards but not these fields, so verified backend media metadata gets lost before `ChatBubble`.

`ChatBubble` already has the basic verified GIF render branch:

```html
<img data-testid="chat-gif" src="..." />
```

Make sure it uses either `message.gifUrl` or `message.mediaUrl`, and that it keeps rejected-media fallback behavior.

## Build Order

1. Implement assistant-text direct media extraction in `hermes.service.js`.
2. Inject/pass `mediaVerifier` into `createHermesService`.
3. Reuse `mediaUrlVerifier` from Handoff #013.
4. Preserve media fields in `HadesPrototypeApp` response mapping.
5. Ensure `ChatBubble` can render `gifUrl` or `mediaUrl`.
6. Run:

```bash
npm run test:hades-inline-gif-media
npm run test:hades-gif-media-reliability
```

## Acceptance Criteria

- Hermes can respond with a direct Tenor GIF URL inside text.
- Backend verifies the URL.
- The assistant message response includes `gifUrl/mediaUrl` fields.
- Frontend preserves those fields.
- UI chat renders the GIF inline.
- Bad Tenor/content-unavailable links still show fallback and do not render broken images.

## Notes

This is related to Handoff #013 but is a narrower regression:

- Handoff #013 covers provider/Discord/media reliability.
- Handoff #016 covers direct GIF URLs embedded in Hermes chat text.
