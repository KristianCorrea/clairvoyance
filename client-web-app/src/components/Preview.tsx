type Props = {
  previewUrl: string | null;
};

export function Preview({ previewUrl }: Props) {
  return (
    <section
      aria-label="Last camera snapshot"
      className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40"
    >
      <div className="border-b border-zinc-800 px-4 py-2 text-sm text-zinc-400">
        Last snapshot
      </div>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob:/dynamic camera URLs
        <img
          src={previewUrl}
          alt="Last frame from the necklace camera"
          className="max-h-56 w-full object-contain bg-black"
        />
      ) : (
        <div className="flex h-40 items-center justify-center px-4 text-center text-sm text-zinc-500">
          No frame yet. Ask a question or test the camera.
        </div>
      )}
    </section>
  );
}
