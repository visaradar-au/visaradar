import { useEffect, useState } from 'preact/hooks';
import { VISA_NAMES, invitedLodgedChange, lastChange, monthSeries, scopeLabel } from '../lib/eoi';
import { formatCell, formatDelta, formatMonth } from '../lib/format';
import { href } from '../lib/href';
import { PROFILE_EVENT, clearProfile, loadProfile, type Profile } from '../lib/profile';
import ProfileSetup from './ProfileSetup';
import { PositionCard, SplitLegend, needsState, scopesForProfile, useOccupation, type OccData } from './shared';

export default function MeProfile({ monthLabel }: { monthLabel: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [initialCode, setInitialCode] = useState<string | undefined>();

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    const code = new URLSearchParams(window.location.search).get('code');
    if (code && /^\d{6}$/.test(code)) setInitialCode(code);
    setReady(true);
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROFILE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const load = useOccupation(profile?.code ?? null);

  if (!ready) return <div class="skeleton" aria-label="Loading" />;

  const showForm = !profile || editing;
  return (
    <div data-testid="me">
      <section class="panel" aria-labelledby="me-form-title">
        <h2 id="me-form-title">{profile && !editing ? 'Your details' : 'Tell us your situation'}</h2>
        {showForm ? (
          <ProfileSetup
            key={profile ? `${profile.code}-${profile.visa}-${profile.points}` : initialCode ?? 'new'}
            idPrefix="me"
            initial={profile}
            initialCode={initialCode}
            withState
            submitLabel={profile ? 'Save changes' : 'Show where I stand'}
            onSaved={() => setEditing(false)}
          />
        ) : (
          profile && (
            <>
              <dl class="kv me-summary">
                <dt>Occupation</dt><dd><a href={href(`/occupations/${profile.code}/`)}>{profile.name}</a> ({profile.code})</dd>
                <dt>Visa</dt><dd>{VISA_NAMES[profile.visa]}</dd>
                {needsState(profile.visa) && (<><dt>State</dt><dd>{profile.state ? scopeLabel(profile.state) : 'All states'}</dd></>)}
                <dt>Points</dt><dd data-testid="me-points">{profile.points}</dd>
              </dl>
              <div class="actions-row">
                <button type="button" class="btn btn-quiet" onClick={() => setEditing(true)}>Edit</button>
                <button type="button" class="btn btn-quiet" onClick={() => clearProfile()}>Clear my details</button>
                <span class="small muted">Kept in this browser's local storage. Clearing removes it.</span>
              </div>
            </>
          )
        )}
      </section>

      {profile && (
        <section aria-labelledby="me-pos-title">
          <h2 id="me-pos-title">Your position in the pool</h2>
          <p class="small muted">
            {profile.name}, {VISA_NAMES[profile.visa]}, {profile.points} points. Submitted EOIs, {monthLabel}.
          </p>
          {load.state === 'ok' ? (
            <>
              <WhatChanged data={load.data} profile={profile} />
              <SplitLegend />
              <div class="position-list" style={{ marginTop: 'var(--s-4)' }}>
                {scopesForProfile(profile).map((s) => (
                  <PositionCard key={s} rows={load.data.rows} profile={profile} scope={s} mine={s === profile.state} link />
                ))}
              </div>
            </>
          ) : load.state === 'error' ? (
            <p role="alert">Could not load the numbers for {profile.name} ({load.message}). Reload the page to try again.</p>
          ) : (
            <div class="skeleton" aria-label="Loading" />
          )}
          <div class="callout" style={{ marginTop: 'var(--s-4)' }}>
            <p><strong>How to read this.</strong> These are counts of EOIs, not people; one person can have several EOIs.</p>
            <p>Each state number is separate. One EOI can name several states, so adding them up would count people twice.</p>
            <p>Cells under 20 are masked by the department. We leave them out of every count and tell you how many we left out.</p>
            <p>Points are only part of the story. States also weigh occupation lists, work experience, where you live and their own quotas. Nothing here says whether you will be invited.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function WhatChanged({ data, profile }: { data: OccData; profile: Profile }) {
  const scope = needsState(profile.visa) ? profile.state || null : 'N/A';
  if (!scope) {
    return <p class="small">Pick a state to see what changed there for {data.name} this month.</p>;
  }
  const months = data.months;
  const sub = lastChange(monthSeries(data.history, months, profile.visa, scope, 'SUBMITTED'));
  const { invited, lodged } = invitedLodgedChange(data.history, months, profile.visa, scope);
  const prev = months.length > 1 ? formatMonth(months[months.length - 2]) : '';
  const d = (c: { delta: number | null }) => (c.delta === null ? 'not comparable (masked)' : formatDelta(c.delta));
  return (
    <div class="panel what-changed">
      <h3>What changed for you since {prev}</h3>
      <p class="small muted">{data.name}, {scopeLabel(scope)}, visa {profile.visa}.</p>
      <dl class="kv">
        <dt>EOIs submitted</dt><dd><strong>{formatCell(sub.current)}</strong> ({d(sub)})</dd>
        <dt>In invited status</dt><dd><strong>{formatCell(invited.current)}</strong> ({d(invited)})</dd>
        <dt>Lodged after invite</dt><dd><strong>{formatCell(lodged.current)}</strong> ({d(lodged)})</dd>
      </dl>
    </div>
  );
}
