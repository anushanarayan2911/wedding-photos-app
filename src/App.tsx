import { useState } from 'react'
import NavBar from './components/NavBar'
import SyncBoard from './components/SyncBoard'
import MemoBoard from './components/MemoBoard'
import type { DesignLanguageResult } from './types'

function App() {
  const [boardData, setBoardData] = useState<DesignLanguageResult | null>(null)

  return (
    <div className="min-h-screen bg-white text-black">
      <NavBar />
      {boardData ? (
        <MemoBoard data={boardData} onBack={() => setBoardData(null)} />
      ) : (
        <SyncBoard onContinue={setBoardData} />
      )}
    </div>
  )
}

export default App
