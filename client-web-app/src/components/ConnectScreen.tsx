type Props = {
  cameraUrl: string;
  busy: boolean;
  stubCamera: boolean;
  cameraOk: boolean | null;
  statusMessage: string;
  onUrlChange: (url: string) => void;
  onTest: () => void;
  onActivate: () => void;
};

/**
 * First screen — connect necklace camera before the guide UI.
 * Activate requires a successful Test, unless stub camera force-passes.
 */
export function ConnectScreen({
  cameraUrl,
  busy,
  stubCamera,
  cameraOk,
  statusMessage,
  onUrlChange,
  onTest,
  onActivate,
}: Props) {
  const canActivate = stubCamera || cameraOk === true;

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-5 py-10">
        <header className="space-y-3">
          <p className="text-base font-semibold uppercase tracking-widest text-emerald-400">
            Clairvoyance
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-50">
            Connect camera
          </h1>
          <p className="text-lg leading-relaxed text-zinc-200">
            Enter the necklace camera URL, test it, then activate the guide.
          </p>
        </header>

        <div
          className="space-y-2 rounded-2xl border border-zinc-600 bg-zinc-900 px-4 py-4"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="text-lg font-medium text-zinc-50">
            {stubCamera
              ? "Stub camera on — you can activate without hardware."
              : cameraOk === true
                ? "Camera connected — ready to activate."
                : cameraOk === false
                  ? "Camera offline — check the URL and test again."
                  : "Camera not tested yet."}
          </p>
          {statusMessage ? (
            <p className="text-base leading-relaxed text-zinc-200">{statusMessage}</p>
          ) : null}
        </div>

        <section aria-label="Camera connection" className="space-y-4">
          <label className="block space-y-2 text-lg text-zinc-100">
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
              className="w-full rounded-xl border-2 border-zinc-500 bg-zinc-950 px-4 py-4 text-lg text-zinc-50 outline-none ring-emerald-400 placeholder:text-zinc-500 focus:ring-4 disabled:opacity-50"
            />
          </label>

          <p className="text-base text-zinc-300">
            SoftAP:{" "}
            <code className="text-zinc-100">http://192.168.4.1</code>
            . Hotspot/STA: use the IP from your phone&apos;s device list.
          </p>

          <button
            type="button"
            onClick={onTest}
            disabled={busy || stubCamera}
            className="min-h-14 w-full rounded-xl border-2 border-zinc-400 bg-zinc-800 px-4 py-4 text-lg font-semibold text-zinc-50 hover:bg-zinc-700 disabled:opacity-50"
          >
            {stubCamera ? "Test skipped (stub camera)" : "Test connection"}
          </button>

          <button
            type="button"
            onClick={onActivate}
            disabled={busy || !canActivate}
            className="min-h-16 w-full rounded-2xl bg-emerald-500 px-4 py-5 text-xl font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
          >
            Activate guide
          </button>
        </section>
      </main>
    </div>
  );
}
