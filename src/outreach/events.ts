export const OUTREACH_EVENTS = {
  contacted: 'outreach.contacted',
  followUp: 'outreach.followUp',
  blocked: 'outreach.blocked',
} as const;

export type ContactedEvent = {
  name: string;
  profileUrl: string;
  postUrl: string;
  kind: string;
  role?: string;
  messaged: boolean;
};

export type FollowUpEvent = { name: string; postUrl: string };
export type BlockedEvent = { reason: string };
