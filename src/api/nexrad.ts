export interface NexradFrame {
  id: string;
  time: number;
}

export function nexradFrames(now = Date.now()): NexradFrame[] {
  const minutes = [50, 45, 40, 35, 30, 25, 20, 15, 10, 5, 0];
  return minutes.map((m) => ({
    id:
      m === 0
        ? "nexrad-n0q-900913"
        : `nexrad-n0q-900913-m${String(m).padStart(2, "0")}m`,
    time: Math.floor((now - m * 60_000) / 1000),
  }));
}

export function nexradTileTemplate(id: string): string {
  return `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/${id}/{z}/{x}/{y}.png`;
}
