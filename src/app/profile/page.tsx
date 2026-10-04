import Link from "next/link";
import { loadProfile } from "@/lib/profile";

export const metadata = { title: "Your taste profile · RestaurantMom" };
// Always read live data, never at build time.
export const dynamic = "force-dynamic";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`;

function barColor(avg: number) {
  if (avg >= 4) return "bg-[oklch(0.62_0.13_145)]";
  if (avg <= 2.5) return "bg-[var(--tomato)]";
  return "bg-[oklch(0.8_0.12_85)]";
}

function Card({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <section className="mom-note rounded-3xl p-5">
      <h2 className="font-display mb-3 flex items-center gap-2 text-xl font-semibold">
        <span aria-hidden>{emoji}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ProfilePage() {
  const p = await loadProfile();
  const loves = p.tags.filter((t) => t.avg_rating >= 4).slice(0, 3).map((t) => t.tag);
  const avoids = [...p.tags]
    .reverse()
    .filter((t) => t.avg_rating <= 2.5)
    .slice(0, 3)
    .map((t) => t.tag);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="awning" aria-hidden />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-4 pb-12">
        <header className="flex items-baseline justify-between">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Your taste <span className="text-primary">profile</span>
          </h1>
          <Link href="/" className="text-primary text-sm font-semibold underline-offset-4 hover:underline">
            &larr; Back to chat
          </Link>
        </header>

        {p.totals.dishes === 0 ? (
          <Card title="Nothing here yet" emoji="🍽️">
            <p className="text-muted-foreground">
              Tell Mom what you ate and how it was, and your profile will fill in.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Dishes logged", p.totals.dishes],
                ["Restaurants", p.totals.restaurants],
                ["Average rating", p.totals.avg_rating.toFixed(1)],
                ["Never again", p.totals.wont_repeat],
              ].map(([label, value]) => (
                <div key={label} className="mom-note rounded-2xl p-4 text-center">
                  <div className="font-display text-3xl font-semibold">{value}</div>
                  <div className="text-muted-foreground text-sm">{label}</div>
                </div>
              ))}
            </div>

            <Card title="What Mom knows about you" emoji="👩‍🍳">
              <p className="leading-relaxed">
                {loves.length > 0 && (
                  <>
                    You love <strong>{list(loves)}</strong> food.{" "}
                  </>
                )}
                {avoids.length > 0 && (
                  <>
                    You steer clear of <strong>{list(avoids)}</strong>.{" "}
                  </>
                )}
                {loves.length === 0 && avoids.length === 0 && (
                  <>Keep logging meals and Mom will spot your patterns.</>
                )}
              </p>
            </Card>

            <Card title="Flavor leaderboard" emoji="🌶️">
              <ul className="flex flex-col gap-2.5">
                {p.tags.map((t) => (
                  <li key={t.tag} className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-semibold">{cap(t.tag)}</span>
                    <span className="bg-muted h-3 overflow-hidden rounded-full">
                      <span
                        className={`block h-full rounded-full ${barColor(t.avg_rating)}`}
                        style={{ width: `${(t.avg_rating / 5) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {t.avg_rating.toFixed(1)} · {t.times}x
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-5 sm:grid-cols-2">
              <Card title="Hall of fame" emoji="🏆">
                <ul className="flex flex-col gap-3">
                  {p.best.map((d, i) => (
                    <li key={i}>
                      <div className="font-semibold">{d.dish}</div>
                      <div className="text-muted-foreground text-sm">{d.restaurant}</div>
                      {d.note && <div className="text-sm italic">&ldquo;{d.note}&rdquo;</div>}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Wall of shame" emoji="🙅">
                <ul className="flex flex-col gap-3">
                  {p.worst.map((d, i) => (
                    <li key={i}>
                      <div className="font-semibold">
                        {d.dish} <span className="text-primary">{d.rating}★</span>
                      </div>
                      <div className="text-muted-foreground text-sm">{d.restaurant}</div>
                      {d.note && <div className="text-sm italic">&ldquo;{d.note}&rdquo;</div>}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {p.repeats.length > 0 && (
              <Card title="Repeat offenders" emoji="🔁">
                <ul className="flex flex-col gap-2 text-sm">
                  {p.repeats.map((r) => (
                    <li key={r.dish}>
                      <strong>{cap(r.dish)}</strong> at {r.times} places, averaging{" "}
                      <span className="text-primary font-semibold">{r.avg_rating.toFixed(1)}</span>
                      <span className="text-muted-foreground"> ({r.places})</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Your best restaurants" emoji="📍">
              <ul className="flex flex-col gap-2 text-sm">
                {p.places.map((r) => (
                  <li key={r.name} className="flex items-baseline justify-between gap-3">
                    <span>
                      <strong>{r.name}</strong>
                      {r.neighborhood && <span className="text-muted-foreground"> · {r.neighborhood}</span>}
                    </span>
                    <span className="tabular-nums">
                      {r.avg_rating.toFixed(1)} <span className="text-muted-foreground">({r.dishes} dishes)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
