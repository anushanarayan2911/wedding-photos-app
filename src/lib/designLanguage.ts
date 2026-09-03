import type { DesignLanguageResult } from '../types'

export async function fetchDesignLanguage(url: string): Promise<DesignLanguageResult> {
  const response = await fetch('/api/design-language', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(25000),
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'Something went wrong.')
  }

  return data
}

export function describeFetchError(err: unknown): string {
  if (err instanceof DOMException && err.name === 'TimeoutError') {
    return 'That site took too long to respond. Try again?'
  }
  return err instanceof Error ? err.message : 'Something went wrong.'
}
