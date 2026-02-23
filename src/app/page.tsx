export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <h1 className="text-4xl font-bold">Notavex</h1>
        <p className="text-lg text-center sm:text-left">
          Application web Next.js avec architecture Domain-Driven Design
        </p>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            href="/api/users"
            target="_blank"
            rel="noopener noreferrer"
          >
            Voir API Users
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:min-w-44"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <h2 className="font-bold mb-2">Stack Technique</h2>
            <ul className="text-sm space-y-1">
              <li>Next.js 16 + React 19</li>
              <li>TypeScript 5</li>
              <li>Tailwind CSS v4</li>
              <li>Prisma + PostgreSQL</li>
              <li>Zod Validation</li>
            </ul>
          </div>

          <div className="p-4 border rounded-lg">
            <h2 className="font-bold mb-2">Architecture</h2>
            <ul className="text-sm space-y-1">
              <li>Domain-Driven Design</li>
              <li>Controller → Service → Repository</li>
              <li>Validation avec Zod</li>
              <li>API RESTful typée</li>
              <li>Docker ready</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://ui.shadcn.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          shadcn/ui
        </a>
      </footer>
    </div>
  )
}
