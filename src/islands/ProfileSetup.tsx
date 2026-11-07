import { useState } from 'preact/hooks';
import type { Visa } from '../lib/eoi';
import { roundPoints, saveProfile, type Profile } from '../lib/profile';
import { OccupationField, PointsField, StateField, VisaField, matchOccupation, needsState, optionLabel, useOccupationList } from './shared';

interface Props {
  idPrefix: string;
  initial?: Profile | null;
  /** Show the state field (the /me form does; the home quick setup doesn't). */
  withState?: boolean;
  submitLabel?: string;
  onSaved?: (p: Profile) => void;
}

/** The profile form. Saves to localStorage only. */
export default function ProfileSetup({ idPrefix, initial, withState = false, submitLabel = 'Show where I stand', onSaved }: Props) {
  const list = useOccupationList();
  const [occ, setOcc] = useState(initial ? optionLabel(initial.code, initial.name) : '');
  const [visa, setVisa] = useState<Visa>(initial?.visa ?? '190');
  const [state, setState] = useState(initial?.state ?? '');
  const [points, setPoints] = useState(initial ? String(initial.points) : '');
  const [tried, setTried] = useState(false);

  const match = matchOccupation(list, occ);
  const pts = Number(points);
  const pointsOk = points !== '' && Number.isFinite(pts) && pts >= 0 && pts <= 200;

  function submit(e: Event) {
    e.preventDefault();
    setTried(true);
    if (!match || !pointsOk) return;
    const p: Profile = {
      code: match[0],
      name: match[1],
      visa,
      state: needsState(visa) ? state : '',
      points: roundPoints(pts),
    };
    saveProfile(p);
    onSaved?.(p);
  }

  return (
    <form class="profile-form" onSubmit={submit} noValidate>
      <OccupationField id={`${idPrefix}-occ`} value={occ} onInput={setOcc} invalid={tried && !match} />
      <VisaField id={`${idPrefix}-visa`} value={visa} onChange={setVisa} />
      {withState && <StateField id={`${idPrefix}-state`} value={state} onChange={setState} disabled={!needsState(visa)} />}
      <PointsField id={`${idPrefix}-points`} value={points} onInput={setPoints} invalid={tried && !pointsOk} />
      <div class="actions">
        <button class="btn" type="submit">
          {submitLabel}
        </button>
        <span class="small muted">Saved in this browser only. Nothing is sent to us.</span>
      </div>
    </form>
  );
}
