// UTC strings from the API lack the "Z" suffix; append it so the browser
// parses them as UTC rather than local time.
function toUtcDate(isoString: string): Date {
  const s = isoString.endsWith('Z') ? isoString : isoString + 'Z';
  return new Date(s);
}

const BRAZIL_TZ = 'America/Sao_Paulo';

function getLocale(): string {
  const saved = localStorage.getItem('bolao_lang');
  return saved === 'en' ? 'en-US' : 'pt-BR';
}

export function formatBrazilDate(isoString: string): string {
  return toUtcDate(isoString).toLocaleDateString(getLocale(), {
    timeZone: BRAZIL_TZ,
    day: '2-digit',
    month: 'short',
  }).toUpperCase();
}

export function formatBrazilTime(isoString: string): string {
  return toUtcDate(isoString).toLocaleTimeString('pt-BR', {
    timeZone: BRAZIL_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function isMatchLocked(kickoffAt: string): boolean {
  const twoHoursBefore = new Date(toUtcDate(kickoffAt).getTime() - 2 * 60 * 60 * 1000);
  return twoHoursBefore <= new Date();
}
