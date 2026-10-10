type Props = {
  cameraUrl: string;
  busy: boolean;
  onUrlChange: (url: string) => void;
  onTest: () => void;
};

export function CameraConfig({ cameraUrl, busy, onUrlChange, onTest }: Props) {
  return (
    <section
      aria-label="Camera connection"
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
    >
      <h2 className="text-lg font-medium text-zinc-100">Camera</h2>
      <label className="block space-y-2 text-sm text-zinc-300">
        Camera base URL
        <input
          type="url"
          name="cameraUrl"
          inputMode="url"
          autoComplete="off"
          value={cameraUrl}
          disabled={busy}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="http://192.168.4.1"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-zinc-50 outline-none ring-emerald-500 placeholder:text-zinc-600 focus:ring-2 disabled:opacity-50"
        />
      </label>
      <button
        type="button"
        onClick={onTest}
        disabled={busy}
        className="w-full rounded-xl border border-zinc-600 bg-zinc-800 px-4 py-3 text-base font-medium text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
      >
        Test connection
      </button>
      <p className="text-sm text-zinc-500">
        SoftAP: <code className="text-zinc-300">http://192.168.4.1</code>
        . Hotspot/STA: use the IP from your phone&apos;s device list.
      </p>
    </section>
  );
}
