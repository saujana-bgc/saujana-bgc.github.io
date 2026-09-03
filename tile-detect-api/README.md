# tile-detect-api

Server-side riichi tile detection for the Saujana BGC riichi calculator.
The site on GitHub Pages is static, so scans are POSTed here; this project
runs the same YOLO tile-detector model RiichiCam used, on a Node serverless
function via `onnxruntime-node` + `sharp`.

## Endpoint

`POST /api/detect` (JSON)

```jsonc
// request (expectedCount is optional, but recommended for a complete hand)
{ "image": "<base64 JPEG/PNG>", "expectedCount": 14 }

// response
{ "mode": "individual", "tiles": [{ "suit": "man", "value": 2 }, ...] }
```

Guided scans send normalized viewfinder boxes with the captured dimensions:

```jsonc
{
  "image": "<base64 JPEG>",
  "imageWidth": 1920,
  "imageHeight": 1080,
  "sections": {
    "hand": { "x": 0.02, "y": 0.47, "w": 0.72, "h": 0.28 },
    "winning": { "x": 0.76, "y": 0.47, "w": 0.19, "h": 0.28 },
    "dora": { "x": 0.04, "y": 0.22, "w": 0.60, "h": 0.20 }
  }
}
```

When `expectedCount` is provided, it is included in the recognition prompt. If
the model returns a different number of physical tiles, the API makes one
corrective pass and returns whichever result is closest to the expected count.

`GET /api/detect` loads the model and performs a throwaway inference. The
calculator calls it on mount so the scanner is warm before the first capture.

Errors return `{ "error": "..." }` with an appropriate status code. CORS is
restricted to the GitHub Pages origin and localhost dev ports.

## Layout

- `api/detect.js` — serverless handler (CORS, validation, JSON shape)
- `lib/detect.ts` — sharp letterbox → 640×640 CHW tensor → ONNX → YOLO decode
- `lib/letterbox.ts`, `lib/nms.ts`, `lib/decode-yolo-output.ts`,
  `lib/tile-classes.ts` — detection math, shared with the site's old
  on-device code (from RiichiCam)
- `lib/roboflow-parser.ts` — class label → tile mapping
- `tile-detector.onnx` — the YOLO11m tile detector (also committed to the
  site repo for reference; this is the copy the function loads)

## Local testing

```
npm install
npm run test:unit # deterministic duplicate-removal regressions
npm test          # runs test-llm.mts (blank + synthetic strip sanity)
npx tsx test-llm.mts <photo...> # inspect one or more real-photo results
```

`tsx` is a dev dependency so the TypeScript lib modules can run directly.

## Deploy

```
cd tile-detect-api
npm run deploy
```

The deploy script verifies both model copies, installs locked dependencies,
runs the synthetic and real-photo regressions, then invokes Vercel for a
production deployment. On its first run, select the existing
`tile-detect-api` Vercel project when prompted.

For a preview deployment or faster repeat runs:

```powershell
.\deploy.ps1 -Preview
.\deploy.ps1 -SkipInstall
.\deploy.ps1 -SkipTests
.\deploy.ps1 -SkipInstall -SkipTests -DryRun
```

The function uses the Hobby plan's 2 GB memory ceiling (`vercel.json` sets
`memory: 2048`); cold starts take a few seconds to load the 80 MB model, and
warm instances reuse it.

## Notes

- Input preprocessing is `/255` RGB, CHW, 114-gray letterbox — byte-for-byte
  the same math as RiichiCam's validated browser pipeline.
- The site points at this endpoint via `TILE_DETECT_URL` (set in
  `nuxt.config.ts` runtimeConfig; override with an env var of the same name).
