import { Link } from 'react-router-dom'

const pages = [
  {
    path: '/tbn',
    title: 'TBN行列の計算可視化',
    description: 'Tangent, Bitangent, Normal行列の計算過程をインタラクティブに学ぶ',
    category: '3Dグラフィックス',
  },
  // 新しいページを追加する場合はここに追加
]

const Home = () => {
  const categories = [...new Set(pages.map(p => p.category))]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-cyan-400">
          学習ノート
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Claudeと一緒に学んだ技術トピックのまとめ
        </p>

        {categories.map(category => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold text-cyan-300 mb-4 border-b border-gray-700 pb-2">
              {category}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {pages
                .filter(p => p.category === category)
                .map(page => (
                  <Link
                    key={page.path}
                    to={page.path}
                    className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors border border-gray-700 hover:border-cyan-500"
                  >
                    <h3 className="text-lg font-medium text-white mb-2">
                      {page.title}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {page.description}
                    </p>
                  </Link>
                ))}
            </div>
          </div>
        ))}

        {pages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            まだコンテンツがありません
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
