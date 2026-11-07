// State program status labels and the badge/pill class that colours them (always shown with the label).
export const PROGRAM_STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: 'Open', cls: 'good' },
  closed: { label: 'Closed', cls: 'critical' },
  paused: { label: 'Paused', cls: 'warn' },
  'not-yet-open': { label: 'Not yet open', cls: 'warn' },
  unknown: { label: 'Not confirmed yet', cls: '' },
};

export const statusOf = (s: string | null | undefined) => PROGRAM_STATUS[s ?? 'unknown'] ?? PROGRAM_STATUS.unknown;
