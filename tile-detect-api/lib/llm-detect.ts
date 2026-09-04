// Tile detection via the z.ai API (https://docs.z.ai) using the multimodal
// vision LLM glm-5.3-flash instead of the previous local ONNX YOLO model.
//
// The model returns one entry per physical tile with its face code and an
// approximate normalized center. Entries are mapped onto the RawPrediction
// shape (label + confidence 1.0 + pixel coordinates) so the existing
// parsePredictions ordering and splitBySection section-splitting keep working
// unchanged — the LLM is a drop-in replacement for the ONNX detector.
import sharp from 'sharp';
import { roboflowLabelToTile, type RawPrediction } from './roboflow-parser.js';
import type { Tile } from './types.js';

const ZAI_CHAT_URL = process.env.ZAI_CHAT_URL ?? 'https://api.z.ai/api/paas/v4/chat/completions';
const MAX_IMAGE_EDGE = 1536;
// Two corrective attempts must fit inside Vercel's 60-second function limit.
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_DETECTION_ATTEMPTS = 2;

// Rough per-tile size used for RawPrediction.width/height; nothing downstream
// consumes it today (sections.ts matches on centers only) but the field is
// part of the shape.
const NOMINAL_TILE_FRACTION = 0.12;

// The tile code notation, spelled out for the model. Honors use the Roboflow
// z-notation the parser already understands (1z=East … 5z=Haku, 6z=Hatsu,
// 7z=Chun); red fives are reported as the suit five with aka=true.
const CODE_GUIDE = `Suited tiles: suit letter m (man, characters), p (pin, circles/dots), s (sou, bamboo sticks), value 1-9 — e.g. "3m", "7p", "1s".
Sou (bamboo) tiles differ by stick count — COUNT the sticks before assigning a number: 4s = four sticks in a 2x2 square; 5s = exactly FIVE sticks arranged like a flower/X around the center; 6s = SIX sticks in two columns of three; 7s = five sticks plus one stacked above the middle; 8s = EIGHT sticks in two columns of four. A five is never six sticks — 5s and 6s are the most confused pair, so verify the count.
Pin (circles) tiles: count the circles the same way. 5p = one large circle at the center with two above and two below; 7p = four circles in a diagonal half-frame around one corner circle.
Honors: "1z" East wind, "2z" South wind, "3z" West wind, "4z" North wind, "5z" White Dragon (haku — a blank white tile with a thin blue frame), "6z" Green Dragon (hatsu), "7z" Red Dragon (chun).
Red fives (aka dora): a 5 whose center markings are red instead of blue/black — the center stick of 5s turns red while the other four stay green, still exactly five sticks. Report it as the suit's five ("5m"/"5p"/"5s") with "aka": true. Ordinary fives have "aka": false.
Careful with the White Dragon (5z): its face is nearly blank, but it is NOT a plain tile — check for the thin blue rectangular frame around the edge. Do not mistake it for a pin/sou tile with small markings, and do not mistake an East wind (1z, the boxed character 東) for it.`;

const SYSTEM_PROMPT = `You are a meticulous Japanese riichi mahjong tile recognizer. You identify every physical mahjong tile face visible in a photo and report each one with a tile code and its approximate position.

Tile code notation:
${CODE_GUIDE}

Rules:
- Report each PHYSICAL tile exactly once. Two identical faces side by side are two entries. Never invent tiles that are not visible, never list the same physical tile twice, and never guess tiles partially hidden behind others.
- Double-check each entry against the image before including it: it must correspond to one clearly visible tile.
- Before assigning a number to any suited tile, COUNT the markings (bamboo sticks / circles / characters) and match them to the guide — do not pattern-match "a cluster of sticks" as a number. For bamboo, count the sticks individually: 5s has exactly five, 6s has exactly six, and they are the pair most often confused.
- Tiles may be rotated sideways or upside down; recognize the face regardless of orientation.
- Recognize tiles from any angle: overhead shots, side shots, stacks, tilted tiles.
- Ignore anything that is not a mahjong tile face: the table, tile backs, walls, score sticks, other players' out-of-focus tiles, boxes, shadows.
- Coordinates are the center of the tile as a fraction of image width (x) and height (y), each strictly between 0 and 1.

Respond with ONLY a JSON object in exactly this schema — no prose, no markdown, no reasoning steps:
{"tiles":[{"code":"5m","aka":false,"x":0.42,"y":0.63}]}`;

const USER_PROMPT = 'Identify every mahjong tile face in this image. Return the JSON object only.';

// Focused single-tile pass: the caller crops the winning-tile region from the
// full frame and this prompt reads just that crop, so the model decides the
// face instead of relying on approximate full-frame coordinates landing
// inside a small section box.
const WINNER_SYSTEM_PROMPT = `You are a meticulous Japanese riichi mahjong tile recognizer. The image is a close-up crop of exactly one mahjong tile face (it may be slightly tilted or rotated, and neighbors may clip the edges).

Tile code notation:
${CODE_GUIDE}

Rules:
- Identify the tile face at the CENTER of the image. Anything partially visible at the very edge of the crop is a neighbor, not the answer — ignore it.
- Before assigning a number to any suited tile, COUNT the markings (bamboo sticks / circles / characters) and match them to the guide. For bamboo, count the sticks individually: 5s has exactly five, 6s has exactly six.
- Tiles may be rotated sideways or upside down; recognize the face regardless of orientation.
- If no mahjong tile face is recognizable at the center, return an empty tiles array.

Respond with ONLY a JSON object in exactly this schema — no prose, no markdown, no reasoning steps:
{"tiles":[{"code":"5m","aka":false,"x":0.5,"y":0.5}]}`;

export interface LlmTile {
  code?: unknown;
  aka?: unknown;
  x?: unknown;
  y?: unknown;
}

export function isZaiConfigured(): boolean {
  return !!process.env.ZAI_API_KEY;
}

// One throwaway text-only completion so the readiness check exercises the API
// key and model name, not just env-var presence.
export async function warmUpLlm(): Promise<void> {
  if (!isZaiConfigured()) {
    throw new Error('ZAI_API_KEY is not configured');
  }
  const res = await fetch(ZAI_CHAT_URL, {
    method: 'POST',
    headers: zaiHeaders(),
    body: JSON.stringify({
      model: zaiModel(),
      messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
      stream: false,
      // max_tokens leaves room for the reasoning pass; only res.ok matters here.
      max_tokens: 512,
      thinking: { type: 'enabled', clear_thinking: false },
      reasoning_effort: 'low',
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`z.ai warm-up failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

function zaiModel(): string {
  return process.env.ZAI_MODEL ?? 'glm-5.3-flash';
}

function zaiHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.ZAI_API_KEY ?? ''}`,
  };
}

// Runs detection on a base64 image. Coordinates returned by the LLM are
// normalized (0..1); they are mapped onto the caller-provided original image
// pixel size so splitBySection's normalized section boxes line up.
export async function detectTilesLlm(
  imageBase64: string,
  imgWidth: number,
  imgHeight: number,
  expectedCount?: number,
  handCountHint?: number,
): Promise<RawPrediction[]> {
  const resized = await sharp(Buffer.from(imageBase64, 'base64'))
    .rotate() // honor EXIF orientation before measuring
    .resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  const normalizedExpectedCount = typeof expectedCount === 'number' && Number.isInteger(expectedCount) && expectedCount > 0
    ? expectedCount
    : undefined;
  const normalizedHandCount = typeof handCountHint === 'number' && Number.isInteger(handCountHint) && handCountHint > 0
    ? handCountHint
    : undefined;
  let kept: LlmTile[] = [];

  // Vision responses can occasionally stop after listing only the distinct
  // faces (a seven-pairs hand then comes back as 7 instead of 14). When the
  // caller knows how many physical tiles should be in the shot, tell the model
  // explicitly and make one independent retry if the first count is wrong.
  // Keep the closest result; on a tie prefer the fuller result because the UI
  // can remove a false positive, while a missing tile loses information.
  for (let attempt = 0; attempt < (normalizedExpectedCount ? MAX_DETECTION_ATTEMPTS : 1); attempt++) {
    const data = await chatWithImage(resized.toString('base64'), normalizedExpectedCount, attempt, normalizedHandCount);
    const candidate = deduplicateSpatialEchoes(extractTiles(data), imgWidth, imgHeight);
    if (
      kept.length === 0 ||
      normalizedExpectedCount && (
        Math.abs(candidate.length - normalizedExpectedCount) < Math.abs(kept.length - normalizedExpectedCount) ||
        Math.abs(candidate.length - normalizedExpectedCount) === Math.abs(kept.length - normalizedExpectedCount) && candidate.length > kept.length
      )
    ) {
      kept = candidate;
    }
    if (!normalizedExpectedCount || kept.length === normalizedExpectedCount) break;
  }

  const nominalSize = Math.min(imgWidth, imgHeight) * NOMINAL_TILE_FRACTION;
  const predictions: RawPrediction[] = [];
  for (const tile of kept) {
    const label = tileToLabel(tile);
    if (!label) continue;
    const x = clamp01(tile.x) * imgWidth;
    const y = clamp01(tile.y) * imgHeight;
    predictions.push({
      class: label,
      confidence: 0.99,
      x,
      y,
      width: nominalSize,
      height: nominalSize * 1.4,
    });
  }
  return predictions;
}

/**
 * Remove only near-identical spatial echoes. The old implementation used a
 * whole estimated tile pitch as its threshold, which erased legitimate
 * adjacent copies of the same face — most visibly all seven pairs in a
 * chiitoitsu hand. An echo is much closer than the width of a physical tile,
 * so use a deliberately small fixed fraction of the nominal tile size.
 */
export function deduplicateSpatialEchoes(
  tiles: LlmTile[],
  imgWidth: number,
  imgHeight: number,
): LlmTile[] {
  const echoRadiusPx = Math.min(imgWidth, imgHeight) * NOMINAL_TILE_FRACTION * 0.2;
  const kept: LlmTile[] = [];
  for (const tile of tiles) {
    const x = clamp01(tile.x) * imgWidth;
    const y = clamp01(tile.y) * imgHeight;
    const duplicate = kept.some((other) => {
      if (other.code !== tile.code || other.aka !== tile.aka) return false;
      const dx = clamp01(other.x) * imgWidth - x;
      const dy = clamp01(other.y) * imgHeight - y;
      return Math.hypot(dx, dy) < echoRadiusPx;
    });
    if (!duplicate) kept.push(tile);
  }
  return kept;
}

async function chatWithImage(
  imageBase64: string,
  expectedCount?: number,
  attempt = 0,
  handCountHint?: number,
): Promise<unknown> {
  if (!isZaiConfigured()) {
    throw new Error('ZAI_API_KEY is not configured');
  }
  let userPrompt = USER_PROMPT;
  if (expectedCount) {
    userPrompt += ` This photo should contain exactly ${expectedCount} physical tiles. Count repeated faces separately and verify that the tiles array has ${expectedCount} entries.`;
  } else if (handCountHint) {
    // Guided scan: the frame holds several regions, so a whole-photo count
    // would be wrong — instead tell the model how many tiles the long hand
    // row should hold. The caller retries if the resulting section count
    // is off.
    userPrompt += ` The photo shows a mahjong table with several regions. The long row of ${handCountHint} tiles is the player's hand — that row should contain exactly ${handCountHint} physical tiles, counted with repeated faces separately. Dora indicators and called melds may also be visible in other regions.`;
  }
  const res = await fetch(ZAI_CHAT_URL, {
    method: 'POST',
    headers: zaiHeaders(),
    body: JSON.stringify({
      model: zaiModel(),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
      stream: false,
      // z.ai's vision request schema doesn't accept response_format
      // (documented for text models only), so JSON discipline comes from the
      // prompt; extractTiles tolerates fenced or prose-wrapped replies.
      // GLM-5.3 reasoning can't be disabled — it lands in a separate response
      // field, and 'low' keeps it brief for the 60s function budget.
      thinking: { type: 'enabled', clear_thinking: false },
      reasoning_effort: 'low',
      // z.ai has no seed parameter, so the corrective retry raises the
      // temperature instead — a pixel-identical second answer helps no one.
      temperature: attempt === 0 ? 0.2 : 0.7,
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`z.ai request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Single-tile pass over a cropped close-up of the winning-tile region.
// Returns the recognized tile, or null when nothing identifiable is at the
// crop's center. Deliberately no retry: the caller falls back to the
// full-frame section box if this comes back empty.
export async function detectWinningTile(cropBase64: string): Promise<Tile | null> {
  const resized = await sharp(Buffer.from(cropBase64, 'base64'))
    .rotate()
    .resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  if (!isZaiConfigured()) {
    throw new Error('ZAI_API_KEY is not configured');
  }
  const res = await fetch(ZAI_CHAT_URL, {
    method: 'POST',
    headers: zaiHeaders(),
    body: JSON.stringify({
      model: zaiModel(),
      messages: [
        { role: 'system', content: WINNER_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${resized.toString('base64')}` } },
            { type: 'text', text: 'Identify the mahjong tile face at the center of this crop. Return the JSON object only.' },
          ],
        },
      ],
      stream: false,
      thinking: { type: 'enabled', clear_thinking: false },
      reasoning_effort: 'low',
      temperature: 0.2,
      max_tokens: 512,
    }),
    // One tile is a much shorter completion than a full hand; keep a tighter
    // ceiling so the guided scan's budget stays inside the function limit.
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`z.ai request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const tiles = extractTiles(await res.json());
  for (const tile of tiles) {
    const label = tileToLabel(tile);
    if (!label) continue;
    try {
      return roboflowLabelToTile(label);
    } catch {
      // Unreachable for labels produced by tileToLabel, but stay safe.
    }
  }
  return null;
}

interface ChatMessageShape {
  content?: unknown;
  reasoning_content?: unknown;
  thinking?: unknown;
}

function extractTiles(data: unknown): LlmTile[] {
  // z.ai answers arrive OpenAI-style (choices[0].message); the bare Ollama
  // message shape stays as a fallback while the provider switch settles.
  const dataObj = data as {
    choices?: { message?: ChatMessageShape }[];
    message?: ChatMessageShape;
  };
  const message: ChatMessageShape | undefined =
    Array.isArray(dataObj.choices) && dataObj.choices[0]?.message
      ? dataObj.choices[0].message
      : dataObj.message;
  let content = typeof message?.content === 'string' ? message.content : '';
  if (!content.trim() && typeof message?.reasoning_content === 'string') {
    // A reasoning-only completion puts everything in the thinking channel.
    content = message.reasoning_content;
  }
  if (!content.trim() && typeof message?.thinking === 'string') {
    // Ollama's name for the same channel, kept for symmetry.
    content = message.thinking;
  }
  if (!content.trim()) {
    throw new Error('z.ai response had no message content');
  }
  // Some endpoints return the JSON object string-encoded inside the message
  // content ("{\"tiles\":...}"), i.e. JSON-in-JSON. Unwrap that layer first;
  // a plain object arrives as {...} directly.
  let text = content.trim();
  const unquoted = tryParse(text);
  if (typeof unquoted === 'string') text = unquoted.trim();

  let parsed: unknown = tryParse(text);
  if (parsed === null) {
    // Tolerate a fenced or trailing-prose reply: grab the first {...} block.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error(`z.ai response was not valid JSON: ${text.slice(0, 200)}`);
    }
    parsed = tryParse(text.slice(start, end + 1));
  }
  if (parsed === null) {
    throw new Error(`z.ai response was not valid JSON: ${text.slice(0, 200)}`);
  }
  const tiles = (parsed as { tiles?: unknown })?.tiles;
  return Array.isArray(tiles) ? (tiles as LlmTile[]) : [];
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const VALID_CODES = new Set([
  ...['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m'],
  ...['1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p'],
  ...['1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s'],
  ...['1z', '2z', '3z', '4z', '5z', '6z', '7z'],
]);

// LLM tile entry -> Roboflow-style label (e.g. "5mr" for a red man five), the
// notation roboflowLabelToTile already understands.
function tileToLabel(tile: LlmTile): string | null {
  const code = typeof tile.code === 'string' ? tile.code.trim().toLowerCase() : '';
  let normalized = code;
  let aka = tile.aka === true;
  // Accept the app's "0 = red five" shorthand too.
  const redShorthand = normalized.match(/^0([mps])$/);
  if (redShorthand) {
    normalized = `5${redShorthand[1]}`;
    aka = true;
  }
  if (!VALID_CODES.has(normalized)) return null;
  const isFive = normalized.length === 2 && normalized[0] === '5' && normalized[1] !== 'z';
  if (aka && !isFive) return null;
  return normalized + (aka ? 'r' : '');
}

function clamp01(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0.5;
  return Math.min(1, Math.max(0, n));
}
