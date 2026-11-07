// Plain-English explanations shown next to jargon. Keep each under ~40 words.
export const glossary = {
  EOI: 'Expression of Interest. The profile you lodge in SkillSelect. Counts here are EOIs, not people: one person can have several.',
  ROI: 'Registration of Interest. Some states ask you to register with them before they will consider nominating you.',
  ANZSCO: 'The 6-digit code for your occupation, such as 261313 Software Engineer. SkillSelect groups EOIs by it.',
  '189': 'Skilled Independent visa. Permanent, no state nomination. Home Affairs invites in national rounds.',
  '190': 'Skilled Nominated visa. Permanent, needs a state or territory to nominate you.',
  '491': 'Skilled Work Regional visa. Provisional, needs a state nomination or an eligible relative in a regional area (491 family).',
  masked: 'The department hides any count under 20 and shows "<20". We never guess these, and leave them out of totals.',
  SUBMITTED: 'EOIs waiting in the pool at month end. They have not been invited.',
  INVITED: 'EOIs still in invited status at month end. It falls when people lodge, so read it next to LODGED.',
  LODGED: 'EOIs whose owner lodged a visa application after being invited.',
  HOLD: 'EOIs put on hold, for example while a state assesses them.',
} as const;

export type GlossaryKey = keyof typeof glossary;
