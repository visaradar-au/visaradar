// Deterministic keyword tags for news items. Rules run on title + excerpt, lowercased.
// Order matters only for readability; every matching rule adds its tag. No match: "other".

export const TAGS = [
  'program-open',
  'program-closed',
  'allocation',
  'round',
  'invitations',
  'occupation-list',
  'points-test',
  'processing',
  'fees',
  'policy',
  'other',
];

const RULES = [
  ['program-closed', /\b(closed|closing|closes|close|paused|pause|suspend(ed)?|not yet open|not currently)\b/],
  ['program-open', /\b(now open|opens?|opening|opened|reopen(s|ed|ing)?|now published|program (is )?live)\b/],
  ['allocation', /\b(allocations?|nomination places|places available|quota)\b/],
  ['round', /\b(invitation rounds?|rounds?)\b/],
  ['invitations', /\b(invitations?|invited|invites?)\b/],
  [
    'occupation-list',
    /\b(occupation lists?|occupations? list|skilled occupation|skills lists?|qsol|wasmol|mltssl|stsol|csol|rol|anzsco|priority (sectors?|occupations?|roles?))\b/,
  ],
  ['points-test', /\b(points test|points-tested|matrix score|minimum (matrix )?score|points)\b/],
  ['processing', /\b(processing( times?)?|backlog)\b/],
  ['fees', /\b(fees?|charges?|costs?)\b/],
  [
    'policy',
    /\b(polic(y|ies)|legislat\w*|ministerial direction|reforms?|changes? to|new laws?|dama|migration program|snmp|program update|settings)\b/,
  ],
];

/** @param {{title:string, excerpt?:string|null}} item @returns {string[]} */
export function tagItem({ title, excerpt }) {
  const text = `${title ?? ''} ${excerpt ?? ''}`.toLowerCase();
  // "not yet open" is a closed signal, so hide it from the open rule.
  const forOpen = text.replace(/\bnot (yet |currently )?open\w*/g, '');
  const tags = RULES.filter(([t, re]) => re.test(t === 'program-open' ? forOpen : text)).map(([t]) => t);
  return tags.length ? tags : ['other'];
}
