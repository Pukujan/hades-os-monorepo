# Hermes Media Fixtures

These files are permanent, deterministic fixtures for Hades/Hermes media and E2E tests.

Do not delete them as cleanup. If a fixture needs to change, update it intentionally and keep the test references in sync.

Regenerate the binary fixtures with:

```bash
npm run generate:hades-media-fixtures
```

Current fixtures:

- `sample-image.png` - tiny PNG for inline Hermes vision requests.
- `sample-audio.wav` - one second WAV for STT proof flows.
- `sample-video.avi` - tiny upload fixture for video/file handling. It is not meant to be a polished browser playback sample.
- `sample-document.pdf` - tiny PDF for the Hades upload/cache bridge.
