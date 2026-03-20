import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles, TimerReset, BarChart3, LogIn } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'

const highlights = [
  {
    title: 'From snag to instruction in minutes',
    description: 'Capture issues, map clauses, and issue architect instructions from one clear workflow.',
    icon: TimerReset,
  },
  {
    title: 'Reliable contract intelligence',
    description: 'Keep every instruction tied to relevant JCT context for stronger auditability.',
    icon: ShieldCheck,
  },
  {
    title: 'Built for daily project delivery',
    description: 'Simple at first glance, powerful under load with clear states and responsive controls.',
    icon: BarChart3,
  },
]

export default function Landing() {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.28),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.24),transparent_40%),radial-gradient(circle_at_50%_90%,rgba(15,23,42,0.9),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-20 top-28 h-80 w-80 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-24 bottom-16 h-96 w-96 rounded-full border border-white/10" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight">Snag-to-Spec</p>
              <p className="text-xs text-slate-300">Contract intelligence platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/app/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
              >
                Open workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Link>
            )}
          </div>
        </header>

        <main className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.2fr_1fr]">
          <section className="space-y-8">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-sky-100">
              Production-ready defect workflow
            </span>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-balance text-4xl font-semibold leading-tight md:text-5xl">
                Faster defect resolution, stronger contract control.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-200">
                Manage snags, generate instructions, and keep decision trails clean. Your data stays
                on your device — each user gets their own isolated workspace.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/app/snags/new"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-primary-500/30 transition hover:bg-primary-400"
                  >
                    Create a snag
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/app/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20"
                  >
                    Open dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold shadow-lg shadow-primary-500/30 transition hover:bg-primary-400"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold transition hover:bg-white/20"
                  >
                    Sign in to workspace
                  </Link>
                </>
              )}
            </div>

            {isAuthenticated && user && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <p className="text-sm text-emerald-300">
                  Signed in as <span className="font-semibold">{user.name}</span>
                </p>
              </div>
            )}
          </section>

          <section className="grid gap-4">
            {highlights.map((item) => {
              const Icon = item.icon
              return (
                <article
                  key={item.title}
                  className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-5 w-5 text-sky-100" />
                  </div>
                  <h2 className="text-base font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{item.description}</p>
                </article>
              )
            })}
          </section>
        </main>
      </div>
    </div>
  )
}
