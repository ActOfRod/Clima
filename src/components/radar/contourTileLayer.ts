import L from "leaflet";
import { chaikinSmooth, marchingSquares, stitchSegments, type Point } from "./contour";

interface ContourOptions {
  threshold?: number;
  sampleStep?: number;
  smoothIterations?: number;
  minPoints?: number;
  strokeStyle?: string;
  lineWidth?: number;
}

const DEFAULTS: Required<ContourOptions> = {
  threshold: 0.12,
  sampleStep: 4,
  smoothIterations: 2,
  minPoints: 8,
  strokeStyle: "rgba(226, 244, 255, 0.8)",
  lineWidth: 1.25,
};

function buildAlphaGrid(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sampleStep: number,
): number[][] {
  const cols = Math.max(2, Math.floor(width / sampleStep) + 1);
  const rows = Math.max(2, Math.floor(height / sampleStep) + 1);
  const grid: number[][] = new Array(rows);

  for (let gy = 0; gy < rows; gy++) {
    const y = Math.min(height - 1, gy * sampleStep);
    const row: number[] = new Array(cols);
    for (let gx = 0; gx < cols; gx++) {
      const x = Math.min(width - 1, gx * sampleStep);
      const idx = (y * width + x) * 4;
      row[gx] = (pixels[idx + 3] ?? 0) / 255;
    }
    grid[gy] = row;
  }

  return grid;
}

function drawSmoothLine(ctx: CanvasRenderingContext2D, points: ReadonlyArray<Point>): void {
  if (points.length < 2) return;

  ctx.moveTo(points[0]!.x, points[0]!.y);
  if (points.length === 2) {
    ctx.lineTo(points[1]!.x, points[1]!.y);
    return;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i] as Point;
    const n = points[i + 1] as Point;
    const mx = (p.x + n.x) * 0.5;
    const my = (p.y + n.y) * 0.5;
    ctx.quadraticCurveTo(p.x, p.y, mx, my);
  }

  const beforeLast = points[points.length - 2] as Point;
  const last = points[points.length - 1] as Point;
  ctx.quadraticCurveTo(beforeLast.x, beforeLast.y, last.x, last.y);
}

function processToContour(
  source: HTMLImageElement,
  target: HTMLCanvasElement,
  options: Required<ContourOptions>,
): void {
  const { width, height } = target;
  const ctx = target.getContext("2d");
  if (!ctx || width <= 0 || height <= 0) return;

  ctx.clearRect(0, 0, width, height);

  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = Math.max(1, Math.floor(width / 2));
  blurCanvas.height = Math.max(1, Math.floor(height / 2));
  const blurCtx = blurCanvas.getContext("2d");
  if (blurCtx) {
    blurCtx.imageSmoothingEnabled = true;
    blurCtx.drawImage(source, 0, 0, blurCanvas.width, blurCanvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(blurCanvas, 0, 0, width, height);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(source, 0, 0, width, height);
  }

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return;
  }

  const grid = buildAlphaGrid(imageData.data, width, height, options.sampleStep);
  const segments = marchingSquares(grid, options.threshold, options.sampleStep);
  if (segments.length === 0) return;

  const lines = stitchSegments(segments)
    .map((line) => chaikinSmooth(line, options.smoothIterations))
    .filter((line) => line.length >= options.minPoints);

  if (lines.length === 0) return;

  ctx.strokeStyle = options.strokeStyle;
  ctx.lineWidth = options.lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const line of lines) {
    ctx.beginPath();
    drawSmoothLine(ctx, line);
    ctx.stroke();
  }
}

class ContourTileLayer extends L.TileLayer {
  private contourOptions: Required<ContourOptions>;

  constructor(urlTemplate: string, options?: L.TileLayerOptions & ContourOptions) {
    const {
      threshold,
      sampleStep,
      smoothIterations,
      minPoints,
      strokeStyle,
      lineWidth,
      ...leafletOptions
    } = options ?? {};

    super(urlTemplate, {
      ...leafletOptions,
      crossOrigin: leafletOptions.crossOrigin ?? true,
    });

    this.contourOptions = {
      threshold: threshold ?? DEFAULTS.threshold,
      sampleStep: sampleStep ?? DEFAULTS.sampleStep,
      smoothIterations: smoothIterations ?? DEFAULTS.smoothIterations,
      minPoints: minPoints ?? DEFAULTS.minPoints,
      strokeStyle: strokeStyle ?? DEFAULTS.strokeStyle,
      lineWidth: lineWidth ?? DEFAULTS.lineWidth,
    };
  }

  override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size = this.getTileSize();
    const canvas = L.DomUtil.create("canvas", "leaflet-tile") as HTMLCanvasElement;
    canvas.width = size.x;
    canvas.height = size.y;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      processToContour(image, canvas, this.contourOptions);
      done(undefined, canvas);
    };

    image.onerror = () => {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      done(undefined, canvas);
    };

    image.src = this.getTileUrl(coords);
    return canvas;
  }
}

export function contourTileLayer(
  urlTemplate: string,
  options?: L.TileLayerOptions & ContourOptions,
): L.TileLayer {
  return new ContourTileLayer(urlTemplate, options);
}
