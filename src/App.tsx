import { useEffect, useState } from 'react'
import NavBar, { type AppTab } from './components/NavBar'
import CreateAccount from './components/CreateAccount'
import UploadPhotos from './components/UploadPhotos'
import PhotoGallery from './components/PhotoGallery'
import SyncBoard from './components/SyncBoard'
import MemoBoard from './components/MemoBoard'
import type { DesignLanguageResult } from './types'
import type { CategorizedPhoto } from './lib/categories'
import { toCssFontFamily } from './lib/font'
import { useDesignFont } from './hooks/useDesignFont'
import { describeFetchError, fetchDesignLanguage } from './lib/designLanguage'

type Stage = 'account' | 'sync' | 'upload' | 'gallery' | 'board'

function App() {
  const [stage, setStage] = useState<Stage>('account')
  const [boardData, setBoardData] = useState<DesignLanguageResult | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [uploadedPhotos, setUploadedPhotos] = useState<CategorizedPhoto[]>([])

  // A board reached via a shared "?site=" link (e.g. one the couple put on
  // their own wedding website) should open straight to that board — no
  // account screen, no re-entering the URL, no upload prompt (that's for the
  // couple's own onboarding, not their guests).
  const [sharedLinkStatus, setSharedLinkStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [sharedLinkError, setSharedLinkError] = useState('')
  const [isSharedLinkView, setIsSharedLinkView] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const site = params.get('site')
    if (!site) return

    setSharedLinkStatus('loading')
    fetchDesignLanguage(site)
      .then((data) => {
        setBoardData(data)
        setSourceUrl(site)
        setStage('board')
        setIsSharedLinkView(true)
        setSharedLinkStatus('idle')
      })
      .catch((err) => {
        setSharedLinkError(describeFetchError(err))
        setSharedLinkStatus('error')
      })
  }, [])

  useDesignFont(boardData?.font)

  const showTabs = !isSharedLinkView && (stage === 'gallery' || stage === 'board')

  return (
    <div className="min-h-screen bg-white text-black">
      <NavBar
        fontFamily={boardData ? toCssFontFamily(boardData.font) : undefined}
        tabs={
          showTabs
            ? {
                active: stage === 'board' ? 'board' : 'gallery',
                onSelect: (tab: AppTab) => setStage(tab),
              }
            : undefined
        }
      />

      {sharedLinkStatus === 'loading' && (
        <div className="px-10 py-14 text-center text-sm text-gray-500">Loading your board…</div>
      )}

      {sharedLinkStatus !== 'loading' && stage === 'board' && boardData && (
        <MemoBoard
          data={boardData}
          sourceUrl={sourceUrl}
          uploadedPhotos={uploadedPhotos}
          onBack={() => {
            setBoardData(null)
            setSourceUrl(null)
            setStage('sync')
          }}
        />
      )}

      {sharedLinkStatus !== 'loading' && stage !== 'board' && (
        <>
          {sharedLinkStatus === 'error' && (
            <p className="px-10 pt-8 text-center text-sm text-red-600">{sharedLinkError}</p>
          )}

          {stage === 'account' && (
            <CreateAccount onCreated={() => setStage('sync')} onSignIn={() => setStage('sync')} />
          )}

          {stage === 'sync' && (
            <SyncBoard
              onContinue={(data, url) => {
                setBoardData(data)
                setSourceUrl(url)
                setStage('upload')
              }}
            />
          )}

          {stage === 'upload' && (
            <UploadPhotos
              onContinue={(photos) => {
                setUploadedPhotos(photos)
                setStage('gallery')
              }}
            />
          )}

          {stage === 'gallery' && (
            <PhotoGallery photos={uploadedPhotos} onContinue={() => setStage('board')} />
          )}
        </>
      )}
    </div>
  )
}

export default App
