import { extractRole } from './extract-role';

describe('extractRole', () => {
  it.each([
    [
      '🚨 HIRING: Senior Backend Engineer 💰 Salary: $190K',
      'Senior Backend Engineer',
    ],
    [
      "🚀 WE'RE HIRING: SENIOR BACKEND ENGINEER | AI STARTUP",
      'Senior Backend Engineer',
    ],
    [
      'Hiring: Software Engineer, Distributed Systems (Core)',
      'Software Engineer',
    ],
    [
      '🚀 Now Hiring: Senior Full Stack Developer (Backend, Infra) | Remote | LATAM',
      'Senior Full Stack Developer',
    ],
    [
      "We're hiring a Senior Backend Engineer in Toronto. Relocation",
      'Senior Backend Engineer',
    ],
    [
      'We are hiring a MuleSoft Integration Engineer to build our platform, remote LATAM',
      'MuleSoft Integration Engineer',
    ],
    [
      'We are hiring remote full-stack developers worldwide!',
      'Full-Stack Developer',
    ],
    [
      'Now hiring: fully remote Senior Node.js Engineer, LATAM',
      'Senior Node.js Engineer',
    ],
  ])('%s → %s', (text, role) => {
    expect(extractRole(text)).toBe(role);
  });

  it('sem cargo reconhecível devolve undefined', () => {
    expect(
      extractRole('We are growing! Join our team, great culture'),
    ).toBeUndefined();
  });
});
