import { useEffect, useState } from 'react'
import NavBar from './components/NavBar'
import CreateAccount from './components/CreateAccount'
import SyncBoard from './components/SyncBoard'
import MemoBoard from './components/MemoBoard'
import type { DesignLanguageResult } from './types'
import { toCssFontFamily } from './lib/font'
import { useDesignFont } from './hooks/useDesignFont'
import { describeFetchError, fetchDesignLanguage } from './lib/designLanguage'

function App() {
  const [hasAccount, setHasAccount] = useState(false)
  const [boardData, setBoardData] = useState<DesignLanguageResult | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)

  // A board reached via a shared "?site=" link (e.g. one the couple put on
  // their own wedding website) should open straight to that board — no
  // account screen, no re-entering the URL.
  const [sharedLinkStatus, setSharedLinkStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [sharedLinkError, setSharedLinkError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const site = params.get('site')
    if (!site) return

    setSharedLinkStatus('loading')
    fetchDesignLanguage(site)
      .then((data) => {
        setBoardData(data)
        setSourceUrl(site)
        setHasAccount(true)
        setSharedLinkStatus('idle')
      })
      .catch((err) => {
        setSharedLinkError(describeFetchError(err))
        setSharedLinkStatus('error')
      })
  }, [])

  useDesignFont(boardData?.font)

  return (
    <div className="min-h-screen bg-white text-black">
      <NavBar fontFamily={boardData ? toCssFontFamily(boardData.font) : undefined} />

      {sharedLinkStatus === 'loading' && (
        <div className="px-10 py-14 text-center text-sm text-gray-500">Loading your board…</div>
      )}

      {sharedLinkStatus !== 'loading' && !hasAccount && (
        <>
          {sharedLinkStatus === 'error' && (
            <p className="px-10 pt-8 text-center text-sm text-red-600">{sharedLinkError}</p>
          )}
          <CreateAccount onCreated={() => setHasAccount(true)} onSignIn={() => setHasAccount(true)} />
        </>
      )}

      {sharedLinkStatus !== 'loading' && hasAccount && (
        boardData ? (
          <MemoBoard
            data={boardData}
            sourceUrl={sourceUrl}
            onBack={() => {
              setBoardData(null)
              setSourceUrl(null)
            }}
          />
        ) : (
          <SyncBoard
            onContinue={(data, url) => {
              setBoardData(data)
              setSourceUrl(url)
            }}
          />
        )
      )}
    </div>
  )
}

export default App
