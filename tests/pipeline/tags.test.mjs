import { describe, it, expect } from 'vitest';
import { tagItem, TAGS } from '../../pipeline/news/tags.mjs';

const t = (title, excerpt) => tagItem({ title, excerpt });

describe('tagItem', () => {
  it('only emits tags from the fixed set', () => {
    for (const title of ['2026-27 SNMP now published', 'Season’s greetings', 'Invitations issued - May 2026']) {
      for (const tag of t(title)) expect(TAGS).toContain(tag);
    }
  });
  it.each([
    ['2026-27 SNMP now published', ['program-open', 'policy']],
    ['Invitations issued - Late May 2026', ['invitations']],
    ['Registrations of Interest closing 2 June 2026 for the 2025-26 program year', ['program-closed']],
    ['State Nominated Migration Program (SNMP) paused', ['program-closed', 'policy']],
    ['2025-26 State Nomination Migration Program Interim allocation', ['allocation', 'policy']],
    ['Minor Adjustment to Application Processing Fees', ['processing', 'fees']],
    ['NSW will focus on Priority Sectors rather than Skilled Occupation Lists', ['occupation-list']],
    ['Canberra Matrix Invitation Round: 12 October 2026', ['round', 'invitations']],
    ['Season’s greetings', ['other']],
  ])('%s', (title, want) => expect(t(title)).toEqual(want));

  it('treats "not yet open" as closed, not open', () => {
    const tags = t('National Innovation Visa: the ACT nomination process is not yet open');
    expect(tags).toContain('program-closed');
    expect(tags).not.toContain('program-open');
  });
  it('reads the excerpt too', () => {
    expect(t('Update', 'Minimum matrix score was 120')).toEqual(['points-test']);
  });
});
