export type BlockChek = { blocked: true; reason: string } | { blocked: false };

export function detectBlock(url: string, pageText: string): BlockChek {
    const text = pageText.toLowerCase();

    if (text.includes('unusual search traffic')) {
        return { blocked: true, reason: 'busca pausada'};
    }

    if (url.includes('/checkpoint/')) {
        return { blocked: true, reason: 'checkpoint' };
    }

    if (url.includes('/login') || url.includes('/uas/login')) {
        return { blocked: true, reason: 'sessão caiu' };
    }

    if (text.includes('weekly invitation limit')) {
        return { blocked: true, reason: 'limite semanal de convites' };
    }

    return { blocked: false };
}
