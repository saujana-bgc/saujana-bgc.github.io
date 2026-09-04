# tile-detect-api

Server-side riichi tile detection for the Saujana BGC riichi calculator.
The site on GitHub Pages is static, so scans are POSTed here; this project
runs a compact MobileNetV3 classifier trained on the exact SVG tile artwork
and calibrated with photographed crops, via `onnxruntime-node` + `sharp`.

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

When `expectedCount` is provided, the detector locates the warm tile-plastic
run, splits it into that many physical tiles, and classifies every crop locally.

`GET /api/detect` loads the model and performs a throwaway inference. The
calculator calls it on mount so the scanner is warm before the first capture.

Errors return `{ "error": "..." }` with an appropriate status code. CORS is
restricted to the GitHub Pages origin and localhost dev ports.

## Layout

- `api/detect.js` — serverless handler (CORS, validation, JSON shape)
- `lib/onnx-detect.ts` — tile-run segmentation, crop rotations, MobileNet ONNX inference
- `lib/roboflow-parser.ts` — class label → tile mapping
- `tile-model.onnx` — 37-class model, including all three aka-dora variants

## Local testing

```
npm install
npm test
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

The function loads the 6.2 MB model once per warm serverless instance. No API
key or external inference service is required.

## Notes

- Input preprocessing is 160×160 ImageNet-normalized RGB. Every crop is tested
  at all four quarter-turn rotations.
- The site points at this endpoint via `TILE_DETECT_URL` (set in
  `nuxt.config.ts` runtimeConfig; override with an env var of the same name).
