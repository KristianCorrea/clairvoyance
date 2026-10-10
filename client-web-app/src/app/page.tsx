export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-50">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-12">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
            KnightHacks
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Guide Client</h1>
          <p className="text-base leading-relaxed text-zinc-400">
            Phone web app for the ESP32 camera necklace. Next: connect to the
            stream, capture a frame, ask a question, hear the AI reply.
          </p>
        </header>

        <section
          aria-label="Camera connection"
          className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
        >
          <h2 className="text-lg font-medium">Camera</h2>
          <label className="block space-y-2 text-sm text-zinc-300">
            Camera base URL
            <input
              type="url"
              name="cameraUrl"
              placeholder="http://192.168.4.1"
              defaultValue="http://192.168.4.1"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-base text-zinc-50 outline-none ring-emerald-500 placeholder:text-zinc-600 focus:ring-2"
            />
          </label>
          <p className="text-sm text-zinc-500">
            SoftAP: <code className="text-zinc-300">http://192.168.4.1</code>
            . Hotspot/STA: use the IP from your phone&apos;s device list.
          </p>
        </section>

        <section
          aria-label="Coming soon"
          className="space-y-2 rounded-2xl border border-dashed border-zinc-700 p-5 text-zinc-400"
        >
          <h2 className="text-lg font-medium text-zinc-200">Build next</h2>
          <ul className="list-inside list-disc space-y-1 text-sm leading-relaxed">
            <li>Preview / snapshot from the MJPEG stream</li>
            <li>Hold-to-talk → speech-to-text</li>
            <li>Send frame + question to a vision API</li>
            <li>Speak the answer with device TTS</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
