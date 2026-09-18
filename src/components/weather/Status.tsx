import { useApp } from "../../context/AppContext";

export function StatusScreen() {
  const { loading, error, refresh } = useApp();
  if (loading) {
    return (
      <div className="grid gap-4">
        <div className="h-40 animate-pulse rounded-[28px] bg-soft" />
        <div className="h-36 animate-pulse rounded-[28px] bg-soft" />
        <div className="h-48 animate-pulse rounded-[28px] bg-soft" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold">Could not load weather</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold"
        >
          Try again
        </button>
      </div>
    );
  }
  return null;
}
