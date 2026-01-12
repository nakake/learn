import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import TBNVisualization from './pages/TBNVisualization'
import DotProductLighting from './pages/DotProductLighting'
import BRDFVisualization from './pages/BRDF'
import FresnelVisualization from './pages/Fresnel'

function App() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ナビゲーションバー */}
      {!isHome && (
        <nav className="bg-gray-800 border-b border-gray-700 px-4 py-2">
          <Link
            to="/"
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            ホームに戻る
          </Link>
        </nav>
      )}

      {/* ルーティング */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tbn" element={<TBNVisualization />} />
        <Route path="/dot-product" element={<DotProductLighting />} />
        <Route path="/brdf" element={<BRDFVisualization />} />
        <Route path="/fresnel" element={<FresnelVisualization />} />
      </Routes>
    </div>
  )
}

export default App
