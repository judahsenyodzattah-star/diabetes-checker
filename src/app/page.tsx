export const dynamic = "force-static";

// Platform preview shell only. The real application lives in /frontend (Vite + React)
// and /backend (FastAPI). See README.md.
export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <p className="m-0 text-sm uppercase tracking-[0.08em] text-slate-600">Diabetes prediction project</p>
        <h1 className="mt-4 text-[clamp(1.75rem,5vw,2.5rem)] font-semibold leading-[1.1] text-slate-950">
          This project is a Vite + FastAPI app
        </h1>
        <p className="mt-4 text-base text-slate-700">
          This page is only the hosting platform&apos;s preview shell. The web app is in{" "}
          <code>frontend/</code> (React, TypeScript, Vite) and the prediction API is in <code>backend/</code>{" "}
          (Python FastAPI). Follow the quick start in <code>README.md</code> to run them.
        </p>
      </section>
    </main>
  );
}
