"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  // ---------- IMAGE REMOVER ----------
  const worker = useRef(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [resultImage, setResultImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });
    }

    const onMessage = (e) => {
      const { status } = e.data;
      if (status === "loading") {
        setLoading(true);
        setProgress(e.data.progress);
      } else if (status === "complete") {
        const { imageData, width, height } = e.data;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.putImageData(imageData, 0, 0);
        setResultImage(canvas.toDataURL("image/png"));
        setLoading(false);
        setProgress(null);
      } else if (status === "error") {
        console.error("Worker error:", e.data.message);
        setLoading(false);
        setProgress(null);
      }
    };

    worker.current.addEventListener("message", onMessage);
    return () => worker.current.removeEventListener("message", onMessage);
  }, []);

  const handleUpload = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    setResultImage(null);
    // show immediate progress state until worker reports actual progress
    setLoading(true);
    setProgress({ stage: 'Starting...' });
    worker.current.postMessage({ imageURL: url });
  };

  // Use a demo image shipped in /public/SomeDude.jpg
  const handleUseDemo = async () => {
    try {
      const resp = await fetch('/SomeDude.jpg');
      if (!resp.ok) throw new Error('Failed to fetch demo image');
      const blob = await resp.blob();
      const file = new File([blob], 'SomeDude.jpg', { type: blob.type });
      handleUpload(file);
    } catch (err) {
      console.error('Demo image error:', err);
    }
  };

  // ---------- JSX ----------
  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white flex flex-col items-center py-12 px-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            AI Background Remover
          </h1>
          <p className="text-zinc-400 mb-0 max-w-2xl mx-auto">
            Upload any image and remove the background instantly. Works best with photos of people
          </p>
        </header>

        {/* Upload & Demo */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleUpload(e.target.files[0])}
            />
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg transform transition hover:scale-[1.02]">
              <span className="text-xl">📁</span>
              <span>Upload Image</span>
            </div>
          </label>

          <button
            onClick={handleUseDemo}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold shadow-lg transform transition hover:scale-[1.02] cursor-pointer"
            title="Use demo image from public/SomeDude.jpg"
          >
            🧪 Demo Image
          </button>
        </div>

        {/* Progress */}
        {loading && (
          <div className="w-full max-w-md mb-6 mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-zinc-400">
                Processing &mdash; {progress?.stage ?? ""}
              </div>
              <div className="text-sm text-zinc-400">
                {progress?.progress
                  ? `${Math.floor(progress.progress * 100)}%`
                  : ""}
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full progress-fill transition-all animate-stripes"
                style={{
                  width: progress?.progress
                    ? `${Math.floor(progress.progress * 100)}%`
                    : "20%",
                }}
              />
            </div>
          </div>
        )}

        {/* Image display */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl mb-12 mx-auto">
          {/* Original */}
          <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow-lg">
            <h2 className="text-lg mb-4 text-zinc-300">Original</h2>
            {originalImage ? (
              <img
                src={originalImage}
                className="rounded-lg max-h-[420px] object-contain mx-auto border border-zinc-800"
              />
            ) : (
              <div className="text-zinc-500 text-center py-20 border-2 border-dashed border-zinc-800 rounded-lg">
                <div className="opacity-70">Upload an image to begin</div>
              </div>
            )}
          </div>

          {/* Result */}
          <div className="rounded-xl p-6 border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow-lg">
            <h2 className="text-lg mb-4 text-zinc-300">Background Removed</h2>
            {resultImage ? (
              <>
                <div
                  className="rounded-lg overflow-hidden border border-zinc-800 mx-auto "
                  style={{ maxHeight: 420 }}
                >
                  <img
                    src={resultImage}
                    className="w-full h-full object-contain bg-[url('/checker.png')]"
                  />
                </div>
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = resultImage;
                      link.download = "no-background.png";
                      link.click();
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-black rounded-lg font-medium hover:brightness-105 transition"
                  >
                    ⤓ Download PNG
                  </button>
                </div>
              </>
            ) : (
              <div className="text-zinc-500 text-center py-20 border-2 border-dashed border-zinc-800 rounded-lg">
                <div className="opacity-70">
                  Processed image will appear here
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
