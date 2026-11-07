import { useEffect, useState } from 'preact/hooks';
import { VISA_NAMES } from '../lib/eoi';
import { href } from '../lib/href';
import { PROFILE_EVENT, loadProfile, type Profile } from '../lib/profile';
import ProfileSetup from './ProfileSetup';
import { PositionCard, SplitLegend, scopesForProfile, useOccupation } from './shared';

/** Home page: the visitor's summary if they saved a profile, else a 3-field setup. */
export default function HomeProfile({ monthLabel, sourceUrl }: { monthLabel: string; sourceUrl: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => {
      const p = loadProfile();
      setProfile(p);
      // An unreadable saved profile must not keep the setup form hidden.
      document.documentElement.classList.toggle('has-profile', Boolean(p));
    };
    sync();
    setReady(true);
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROFILE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const load = useOccupation(profile?.code ?? null);

  if (ready && profile) {
    const scopes = scopesForProfile(profile).slice(0, profile.state ? 1 : 3);
    return (
      <section class="panel home-profile" aria-labelledby="hp-title" data-testid="home-profile">
        <h2 id="hp-title">Where you stand</h2>
        <p class="small muted">
          {profile.name} ({profile.code}), {VISA_NAMES[profile.visa]}, {profile.points} points. EOIs submitted, {monthLabel}.
        </p>
        {load.state === 'ok' ? (
          <>
            <SplitLegend />
            <div class="position-list">
              {scopes.map((s) => (
                <PositionCard key={s} rows={load.data.rows} profile={profile} scope={s} mine={s === profile.state} />
              ))}
            </div>
          </>
        ) : load.state === 'error' ? (
          <p role="alert">Could not load the numbers for this occupation ({load.message}). Try reloading the page.</p>
        ) : (
          <div class="skeleton" aria-label="Loading" />
        )}
        <p class="small muted" style={{ marginTop: 'var(--s-3)' }}>
          These are positions in the pool, not a prediction. States pick people for many reasons besides points.
        </p>
        <p class="asat">
          As at {monthLabel} (month-end snapshot). Source: <a href={sourceUrl} rel="noopener">SkillSelect EOI data</a>.
        </p>
        <div class="next" style={{ marginTop: 'var(--s-4)', paddingTop: 'var(--s-4)' }}>
          <a class="btn" href={href('/me/')}>
            See every state
          </a>
          <a class="btn btn-quiet" href={href(`/occupations/${profile.code}/`)}>
            {profile.name} details
          </a>
        </div>
      </section>
    );
  }

  return (
    <>
    {/* Shown instead of the form, before hydration, to visitors with a saved profile. */}
    {!ready && <div class="skeleton home-wait" aria-hidden="true" />}
    <section class="panel home-profile home-setup" aria-labelledby="hp-title">
      <h2 id="hp-title">Where do you stand?</h2>
      <p class="small muted">
        Enter three things to see how many EOIs sit above and below your points in each state. It stays in your browser.
      </p>
      <ProfileSetup idPrefix="home" />
    </section>
    </>
  );
}
