import { useEffect, useState } from 'preact/hooks';
import { href } from '../lib/href';
import { PROFILE_EVENT, loadProfile, saveProfile, type Profile } from '../lib/profile';

/** "Set as my occupation": updates a saved profile, or starts one on /me. */
export default function SetOccupation({ code, name }: { code: string; name: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    window.addEventListener(PROFILE_EVENT, sync);
    return () => window.removeEventListener(PROFILE_EVENT, sync);
  }, []);
  const isMine = profile?.code === code;

  function setMine() {
    if (profile) {
      saveProfile({ ...profile, code, name });
      setSaved(true);
    } else {
      window.location.href = href(`/me/?code=${code}`);
    }
  }

  return (
    <div class="next">
      <p>{isMine ? `${name} is your saved occupation.` : `Is ${name} your occupation?`}</p>
      {!isMine && (
        <button type="button" class="btn" onClick={setMine}>
          Set as my occupation
        </button>
      )}
      <a class="btn btn-quiet" href={href('/me/')}>
        Where I stand
      </a>
      <span class="small muted" role="status">{saved ? 'Saved in this browser.' : ''}</span>
    </div>
  );
}
