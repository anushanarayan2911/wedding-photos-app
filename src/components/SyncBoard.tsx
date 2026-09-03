import { useState, type FormEvent } from 'react'
import Step from './Step'
import type { DesignLanguageResult } from '../types'
import { toCssFontFamily } from '../lib/font'
import { useDesignFont } from '../hooks/useDesignFont'
import { describeFetchError, fetchDesignLanguage } from '../lib/designLanguage'

const STEPS = [
  {
    title: 'Paste your wedding website URL',
    description: "We'll scan your site for design elements.",
  },
  {
    title: 'We detect your design language',
    description: 'Fonts, colors, and textures are extracted.',
  },
  {
    title: 'Your board auto-matches style',
    description: 'Everything stays perfectly on-brand.',
  },
]

type Status = 'idle' | 'loading' | 'success' | 'error'

interface SyncBoardProps {
  onContinue: (data: DesignLanguageResult, sourceUrl: string) => void
}

export default function SyncBoard({ onContinue }: SyncBoardProps) {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<DesignLanguageResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  useDesignFont(result?.font)

  async function handleConnect(e: FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setStatus('loading')
    setErrorMessage('')

    try {
      const data = await fetchDesignLanguage(url)
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMessage(describeFetchError(err))
      setStatus('error')
    }
  }

  return (
    <section className="grid gap-16 px-10 py-14 md:grid-cols-2">
      <div>
        <h1 className="mb-10 text-4xl font-bold">Sync Your Board</h1>

        <div className="mb-10 flex flex-col gap-8">
          {STEPS.map((step, i) => (
            <Step key={step.title} number={i + 1} title={step.title} description={step.description} />
          ))}
        </div>
      </div>

      <div>
        <form onSubmit={handleConnect}>
          <label htmlFor="site-url" className="mb-2 block text-sm">
            Wedding Website URL
          </label>
          <input
            id="site-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://withjoy.com/sarah-and-james"
            className="mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
          />

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mb-8 w-full rounded-md bg-black py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {status === 'loading' ? 'Connecting…' : 'Connect Site'}
          </button>
        </form>

        {status === 'error' && (
          <p className="mb-4 text-sm text-red-600">{errorMessage}</p>
        )}

        {(status === 'loading' || status === 'success') && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <h2 className="mb-4 text-sm font-bold tracking-wide">STYLE PREVIEW</h2>
            <p className="mb-3 text-sm text-gray-500">Colors, fonts &amp; patterns detected:</p>

            <div className="mb-4 flex gap-2">
              {status === 'loading' &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-10 animate-pulse rounded-md bg-gray-300" />
                ))}

              {status === 'success' && result && result.colors.length > 0 &&
                result.colors.map((color) => (
                  <div
                    key={color}
                    title={color}
                    className="h-10 w-10 rounded-md border border-gray-200"
                    style={{ backgroundColor: color }}
                  />
                ))}

              {status === 'success' && result && result.colors.length === 0 && (
                <p className="text-sm text-gray-400">No brand colors detected.</p>
              )}
            </div>

            <div
              className="mb-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-bold"
              style={{ fontFamily: status === 'success' ? toCssFontFamily(result?.font ?? null) : undefined }}
            >
              {status === 'loading' && 'Detecting font…'}
              {status === 'success' &&
                (result?.font
                  ? `${result.font.family} · ${result.font.category}`
                  : 'No font detected')}
            </div>

            <button
              type="button"
              disabled={status !== 'success' || !result}
              onClick={() => result && onContinue(result, url)}
              className="w-full rounded-md border border-black bg-white py-3 text-sm font-bold disabled:opacity-50"
            >
              Looks good, continue
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
