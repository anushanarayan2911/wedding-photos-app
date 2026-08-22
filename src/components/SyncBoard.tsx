import { useState } from 'react'
import Step from './Step'

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

const SWATCH_COUNT = 4

export default function SyncBoard() {
  const [url, setUrl] = useState('')

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
          type="button"
          className="mb-8 w-full rounded-md bg-black py-3 text-sm font-bold text-white"
        >
          Connect Site
        </button>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-6">
          <h2 className="mb-4 text-sm font-bold tracking-wide">STYLE PREVIEW</h2>
          <p className="mb-3 text-sm text-gray-500">Colors, fonts &amp; patterns detected:</p>

          <div className="mb-4 flex gap-2">
            {Array.from({ length: SWATCH_COUNT }).map((_, i) => (
              <div key={i} className="h-10 w-10 rounded-md bg-gray-300" />
            ))}
          </div>

          <div className="mb-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-bold">
            Baskerville &middot; Serif
          </div>

          <button
            type="button"
            className="w-full rounded-md border border-black bg-white py-3 text-sm font-bold"
          >
            Looks good, continue
          </button>
        </div>
      </div>
    </section>
  )
}
