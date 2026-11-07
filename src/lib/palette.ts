// The search palette's behaviour. Loaded on first open, so it costs nothing until someone searches.
// ARIA: the input is a combobox that controls a listbox; the active option is aria-activedescendant.
import { KIND_LABELS, prepare, search, type Prepared, type SearchEntry } from './search';

let prepared: Prepared[] | null = null;
let loading: Promise<void> | null = null;

function load(url: string): Promise<void> {
  loading ??= fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((idx: { items: SearchEntry[] }) => {
      prepared = prepare(idx.items);
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

/** Wires one dialog. Returns the function that opens it. */
export function setup(dialog: HTMLDialogElement): (from?: HTMLElement | null) => void {
  const input = dialog.querySelector<HTMLInputElement>('[role="combobox"]')!;
  const list = dialog.querySelector<HTMLUListElement>('[role="listbox"]')!;
  const status = dialog.querySelector<HTMLElement>('[data-search-status]')!;
  const close = dialog.querySelector<HTMLButtonElement>('[data-search-close]')!;
  let results: SearchEntry[] = [];
  let active = -1;
  let returnTo: HTMLElement | null = null;

  const setActive = (i: number) => {
    active = results.length ? (i + results.length) % results.length : -1;
    list.querySelectorAll('[role="option"]').forEach((el, n) => el.setAttribute('aria-selected', String(n === active)));
    if (active >= 0) {
      const el = list.children[active] as HTMLElement;
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };

  const go = (i: number) => {
    const e = results[i];
    if (e) location.assign(e[3]);
  };

  const render = () => {
    const q = input.value.trim();
    if (!prepared) return;
    // Empty box: offer the main pages as a starting point.
    results = q ? search(prepared, q) : prepared.filter((p) => p.entry[0] === 'p').map((p) => p.entry);
    list.replaceChildren(
      ...results.map((e, i) => {
        const li = document.createElement('li');
        li.id = `vr-search-opt-${i}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.dataset.kind = e[0];
        const kind = document.createElement('span');
        kind.className = 'kind';
        kind.textContent = KIND_LABELS[e[0]];
        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = e[1];
        const detail = document.createElement('span');
        detail.className = 'detail';
        detail.textContent = e[2];
        li.append(kind, label, detail);
        li.addEventListener('click', () => go(i));
        li.addEventListener('mousemove', () => active !== i && setActive(i));
        return li;
      }),
    );
    input.setAttribute('aria-expanded', String(results.length > 0));
    status.textContent = !q
      ? 'Type an occupation, ANZSCO code, state, visa or page.'
      : results.length
        ? `${results.length === 12 ? 'Top 12' : results.length} result${results.length === 1 ? '' : 's'}. Use the arrow keys and Enter.`
        : `No matches for “${q}”. Try part of an occupation name or a 6-digit ANZSCO code.`;
    setActive(q && results.length ? 0 : -1);
  };

  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') setActive(active + 1);
    else if (e.key === 'ArrowUp') setActive(active - 1);
    else if (e.key === 'Home' && results.length && e.ctrlKey) setActive(0);
    else if (e.key === 'End' && results.length && e.ctrlKey) setActive(results.length - 1);
    else if (e.key === 'Enter') go(active >= 0 ? active : 0);
    else return;
    e.preventDefault();
  });
  // Keep Tab inside the palette: the input and the close button.
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    (document.activeElement === input ? close : input).focus();
  });
  close.addEventListener('click', () => dialog.close());
  // A tap on the backdrop closes it.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    input.setAttribute('aria-expanded', 'false');
    returnTo?.focus();
  });

  return (from) => {
    returnTo = from ?? (document.activeElement as HTMLElement | null);
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
    if (prepared) return render();
    status.textContent = 'Loading the search index…';
    load(dialog.dataset.index!).then(render, () => {
      status.textContent = 'Search could not load. Check your connection and try again.';
    });
  };
}
