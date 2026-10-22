import { parseCommand } from './commands';

describe('parseCommand', () => {
  it.each([
    ['status', { type: 'status' }],
    ['Como tá?', { type: 'status' }],
    ['recentes', { type: 'recent' }],
    ['quem foi abordado', { type: 'recent' }],
    ['pausar', { type: 'pause' }],
    ['Liga o automático', { type: 'resume' }],
    ['parar', { type: 'stop' }],
    ['rodar', { type: 'run', max: 5, live: true }],
    ['rodar 3', { type: 'run', max: 3, live: true }],
    ['simular', { type: 'run', max: 5, live: false }],
    ['ajuda', { type: 'help' }],
    ['bom dia', { type: 'unknown' }],
  ])('%s', (text, command) => {
    expect(parseCommand(text)).toEqual(command);
  });
});
