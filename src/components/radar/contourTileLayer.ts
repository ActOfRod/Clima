import L from "leaflet";
import { skinRadarPixels } from "./radarSkin";

const PAD = 12;

function processSkin(source: HTMLImageElement, target: HTMLCanvasElement): void {
  const ctx = target.getContext("2d");
  if (!ctx) return;

  const width = target.width;
  const height = target.height;
  const innerW = Math.max(1, width - PAD * 2);
  const innerH = Math.max(1, height - PAD * 2);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, PAD, PAD, innerW, innerH);

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    skinRadarPixels(imageData.data);
    ctx.putImageData(imageData, 0, 0);
  } catch {
    return;
  }

  ctx.save();
  ctx.filter = "blur(1.1px)";
  ctx.drawImage(target, 0, 0);
  ctx.restore();
}

class ContourTileLayer extends L.TileLayer {
  override createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const size = this.getTileSize();
    const canvas = L.DomUtil.create("canvas", "leaflet-tile radar-overlap") as HTMLCanvasElement;
    canvas.width = size.x + PAD * 2;
    canvas.height = size.y + PAD * 2;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      processSkin(image, canvas);
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
  options?: L.TileLayerOptions,
): L.TileLayer {
  return new ContourTileLayer(urlTemplate, {
    ...options,
    crossOrigin: options?.crossOrigin ?? true,
  });
}
