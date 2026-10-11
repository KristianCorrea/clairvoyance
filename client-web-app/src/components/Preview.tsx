type Props = {
  previewUrl: string | null;
};

export function Preview({ previewUrl }: Props) {
  return (
    <section
      aria-label="Last camera snapshot"
      className="overflow-hidden rounded-2xl border-2 border-zinc-600 bg-zinc-950"
    >
      <div className="border-b border-zinc-700 px-4 py-2 text-base text-zinc-200">
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
        <div className="flex h-40 items-center justify-center px-4 text-center text-base text-zinc-300">
          No frame yet. Ask a question or test the camera.
        </div>
      )}
    </section>
  );
}
