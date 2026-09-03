import { useState } from 'react'
import NavBar from './components/NavBar'
import CreateAccount from './components/CreateAccount'
import SyncBoard from './components/SyncBoard'
import MemoBoard from './components/MemoBoard'
import type { DesignLanguageResult } from './types'
import { toCssFontFamily } from './lib/font'
import { useDesignFont } from './hooks/useDesignFont'

function App() {
  const [hasAccount, setHasAccount] = useState(false)
  const [boardData, setBoardData] = useState<DesignLanguageResult | null>(null)

  useDesignFont(boardData?.font)

  return (
    <div className="min-h-screen bg-white text-black">
      <NavBar fontFamily={boardData ? toCssFontFamily(boardData.font) : undefined} />
      {!hasAccount ? (
        <CreateAccount onCreated={() => setHasAccount(true)} onSignIn={() => setHasAccount(true)} />
      ) : boardData ? (
        <MemoBoard data={boardData} onBack={() => setBoardData(null)} />
      ) : (
        <SyncBoard onContinue={setBoardData} />
      )}
    </div>
  )
}

export default App
