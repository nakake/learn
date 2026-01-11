import React, { useState, useMemo } from 'react';

const TBNVisualization = () => {
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showFormulas, setShowFormulas] = useState(true);
  const [triangleMode, setTriangleMode] = useState('default');

  // 三角形の頂点データ（位置とUV座標）
  const trianglePresets = {
    default: {
      name: '基本三角形',
      positions: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 1, y: 2, z: 0 }
      ],
      uvs: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 0.5, v: 1 }
      ]
    },
    tilted: {
      name: '傾斜三角形',
      positions: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 1 },
        { x: 1, y: 1.5, z: 0.5 }
      ],
      uvs: [
        { u: 0, v: 0 },
        { u: 1, v: 0 },
        { u: 0.5, v: 1 }
      ]
    },
    rotated: {
      name: '回転UV',
      positions: [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 0 },
        { x: 1, y: 2, z: 0 }
      ],
      uvs: [
        { u: 0.5, v: 0 },
        { u: 1, v: 0.5 },
        { u: 0, v: 0.5 }
      ]
    }
  };

  const currentTriangle = trianglePresets[triangleMode];
  const { positions: p, uvs: uv } = currentTriangle;

  // TBN計算
  const tbnCalculation = useMemo(() => {
    // エッジベクトル（位置）
    const edge1 = {
      x: p[1].x - p[0].x,
      y: p[1].y - p[0].y,
      z: p[1].z - p[0].z
    };
    const edge2 = {
      x: p[2].x - p[0].x,
      y: p[2].y - p[0].y,
      z: p[2].z - p[0].z
    };

    // UV差分
    const deltaUV1 = {
      u: uv[1].u - uv[0].u,
      v: uv[1].v - uv[0].v
    };
    const deltaUV2 = {
      u: uv[2].u - uv[0].u,
      v: uv[2].v - uv[0].v
    };

    // 行列式の逆数
    const det = deltaUV1.u * deltaUV2.v - deltaUV2.u * deltaUV1.v;
    const f = det !== 0 ? 1.0 / det : 0;

    // Tangent計算
    const tangent = {
      x: f * (deltaUV2.v * edge1.x - deltaUV1.v * edge2.x),
      y: f * (deltaUV2.v * edge1.y - deltaUV1.v * edge2.y),
      z: f * (deltaUV2.v * edge1.z - deltaUV1.v * edge2.z)
    };

    // Bitangent計算
    const bitangent = {
      x: f * (-deltaUV2.u * edge1.x + deltaUV1.u * edge2.x),
      y: f * (-deltaUV2.u * edge1.y + deltaUV1.u * edge2.y),
      z: f * (-deltaUV2.u * edge1.z + deltaUV1.u * edge2.z)
    };

    // Normal計算（外積）
    const normal = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x
    };

    // 正規化
    const normalize = (v) => {
      const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : v;
    };

    return {
      edge1,
      edge2,
      deltaUV1,
      deltaUV2,
      det,
      f,
      tangent: normalize(tangent),
      bitangent: normalize(bitangent),
      normal: normalize(normal),
      tangentRaw: tangent,
      bitangentRaw: bitangent,
      normalRaw: normal
    };
  }, [p, uv]);

  // 3D投影
  const project = (point, scale = 80) => {
    const radX = (rotation.x * Math.PI) / 180;
    const radY = (rotation.y * Math.PI) / 180;
    
    // Y軸回転
    const x1 = point.x * Math.cos(radY) - point.z * Math.sin(radY);
    const z1 = point.x * Math.sin(radY) + point.z * Math.cos(radY);
    const y1 = point.y;
    
    // X軸回転
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
    const x2 = x1;
    
    return {
      x: 200 + x2 * scale,
      y: 200 - y2 * scale,
      z: z2
    };
  };

  // ベクトル描画用
  const drawVector = (origin, direction, color, label, scale = 1.5) => {
    const start = project(origin);
    const end = project({
      x: origin.x + direction.x * scale,
      y: origin.y + direction.y * scale,
      z: origin.z + direction.z * scale
    });
    
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = 10;
    
    return (
      <g key={label}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`
            ${end.x},${end.y}
            ${end.x - arrowSize * Math.cos(angle - 0.4)},${end.y - arrowSize * Math.sin(angle - 0.4)}
            ${end.x - arrowSize * Math.cos(angle + 0.4)},${end.y - arrowSize * Math.sin(angle + 0.4)}
          `}
          fill={color}
        />
        <text
          x={end.x + 15 * Math.cos(angle)}
          y={end.y + 15 * Math.sin(angle)}
          fill={color}
          fontSize="14"
          fontWeight="bold"
        >
          {label}
        </text>
      </g>
    );
  };

  // マウスイベント
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + dy * 0.5)),
      y: prev.y + dx * 0.5
    }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 三角形の中心
  const center = {
    x: (p[0].x + p[1].x + p[2].x) / 3,
    y: (p[0].y + p[1].y + p[2].y) / 3,
    z: (p[0].z + p[1].z + p[2].z) / 3
  };

  const projectedPoints = p.map(pt => project(pt));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-4 text-cyan-400">
        TBN行列の計算可視化
      </h1>
      
      <div className="flex flex-wrap gap-4 justify-center">
        {/* 3Dビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">3Dビュー（ドラッグで回転）</h2>
          <svg
            width="400"
            height="400"
            className="bg-gray-950 rounded cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* グリッド */}
            {[-2, -1, 0, 1, 2].map(i => {
              const start = project({ x: i, y: 0, z: -2 });
              const end = project({ x: i, y: 0, z: 2 });
              return <line key={`gx${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#333" strokeWidth="1" />;
            })}
            {[-2, -1, 0, 1, 2].map(i => {
              const start = project({ x: -2, y: 0, z: i });
              const end = project({ x: 2, y: 0, z: i });
              return <line key={`gz${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#333" strokeWidth="1" />;
            })}
            
            {/* 座標軸 */}
            {drawVector({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, '#ff6666', 'X', 1)}
            {drawVector({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, '#66ff66', 'Y', 1)}
            {drawVector({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, '#6666ff', 'Z', 1)}
            
            {/* 三角形 */}
            <polygon
              points={projectedPoints.map(pt => `${pt.x},${pt.y}`).join(' ')}
              fill="rgba(100, 200, 255, 0.3)"
              stroke="#64c8ff"
              strokeWidth="2"
            />
            
            {/* 頂点 */}
            {projectedPoints.map((pt, i) => (
              <g key={i}>
                <circle cx={pt.x} cy={pt.y} r={6} fill="#fff" />
                <text x={pt.x + 10} y={pt.y - 10} fill="#fff" fontSize="12">
                  P{i} ({p[i].x.toFixed(1)}, {p[i].y.toFixed(1)}, {p[i].z.toFixed(1)})
                </text>
                <text x={pt.x + 10} y={pt.y + 5} fill="#ffa" fontSize="10">
                  UV({uv[i].u.toFixed(1)}, {uv[i].v.toFixed(1)})
                </text>
              </g>
            ))}
            
            {/* TBNベクトル */}
            {drawVector(center, tbnCalculation.tangent, '#ff4444', 'T (Tangent)', 1.2)}
            {drawVector(center, tbnCalculation.bitangent, '#44ff44', 'B (Bitangent)', 1.2)}
            {drawVector(center, tbnCalculation.normal, '#4444ff', 'N (Normal)', 1.2)}
          </svg>
          
          {/* プリセット選択 */}
          <div className="mt-3 flex gap-2">
            {Object.entries(trianglePresets).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setTriangleMode(key)}
                className={`px-3 py-1 rounded text-sm ${
                  triangleMode === key ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {val.name}
              </button>
            ))}
          </div>
        </div>

        {/* UVマップビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">UVマップ</h2>
          <svg width="200" height="200" className="bg-gray-950 rounded">
            {/* グリッド */}
            {[0, 0.25, 0.5, 0.75, 1].map(i => (
              <React.Fragment key={i}>
                <line x1={i * 180 + 10} y1={10} x2={i * 180 + 10} y2={190} stroke="#333" />
                <line x1={10} y1={i * 180 + 10} x2={190} y2={i * 180 + 10} stroke="#333" />
              </React.Fragment>
            ))}
            
            {/* UV三角形 */}
            <polygon
              points={uv.map(u => `${u.u * 180 + 10},${190 - u.v * 180}`).join(' ')}
              fill="rgba(255, 200, 100, 0.3)"
              stroke="#ffc864"
              strokeWidth="2"
            />
            
            {/* UV頂点 */}
            {uv.map((u, i) => (
              <g key={i}>
                <circle cx={u.u * 180 + 10} cy={190 - u.v * 180} r={5} fill="#ffc864" />
                <text x={u.u * 180 + 15} y={190 - u.v * 180} fill="#fff" fontSize="10">
                  UV{i}
                </text>
              </g>
            ))}
            
            {/* U軸、V軸 */}
            <text x={185} y={200} fill="#f88" fontSize="12">U</text>
            <text x={0} y={15} fill="#8f8" fontSize="12">V</text>
          </svg>
          
          {/* UV差分表示 */}
          <div className="mt-3 text-sm">
            <div className="text-yellow-400">ΔUV₁ = UV₁ - UV₀</div>
            <div className="text-gray-300 ml-2">
              = ({tbnCalculation.deltaUV1.u.toFixed(2)}, {tbnCalculation.deltaUV1.v.toFixed(2)})
            </div>
            <div className="text-yellow-400 mt-1">ΔUV₂ = UV₂ - UV₀</div>
            <div className="text-gray-300 ml-2">
              = ({tbnCalculation.deltaUV2.u.toFixed(2)}, {tbnCalculation.deltaUV2.v.toFixed(2)})
            </div>
          </div>
        </div>

        {/* 計算式パネル */}
        <div className="bg-gray-800 rounded-lg p-4 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-cyan-300">計算過程</h2>
            <button
              onClick={() => setShowFormulas(!showFormulas)}
              className="text-sm px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
            >
              {showFormulas ? '数式を隠す' : '数式を表示'}
            </button>
          </div>
          
          {showFormulas && (
            <div className="space-y-3 text-sm font-mono">
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-cyan-400 mb-1">1. エッジベクトル計算</div>
                <div>E₁ = P₁ - P₀ = ({tbnCalculation.edge1.x.toFixed(2)}, {tbnCalculation.edge1.y.toFixed(2)}, {tbnCalculation.edge1.z.toFixed(2)})</div>
                <div>E₂ = P₂ - P₀ = ({tbnCalculation.edge2.x.toFixed(2)}, {tbnCalculation.edge2.y.toFixed(2)}, {tbnCalculation.edge2.z.toFixed(2)})</div>
              </div>
              
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-cyan-400 mb-1">2. UV行列の逆行列</div>
                <div className="text-xs text-gray-400 mb-1">
                  [T B] = [E₁ E₂] × [ΔU₁ ΔU₂]⁻¹
                </div>
                <div className="text-xs text-gray-400 mb-1">
                       [ΔV₁ ΔV₂]
                </div>
                <div>det = ΔU₁·ΔV₂ - ΔU₂·ΔV₁</div>
                <div className="ml-4">= {tbnCalculation.deltaUV1.u.toFixed(2)}×{tbnCalculation.deltaUV2.v.toFixed(2)} - {tbnCalculation.deltaUV2.u.toFixed(2)}×{tbnCalculation.deltaUV1.v.toFixed(2)}</div>
                <div className="ml-4">= {tbnCalculation.det.toFixed(4)}</div>
                <div>f = 1/det = {tbnCalculation.f.toFixed(4)}</div>
              </div>
              
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-red-400 mb-1">3. Tangent (T)</div>
                <div className="text-xs">T = f × (ΔV₂·E₁ - ΔV₁·E₂)</div>
                <div>= ({tbnCalculation.tangent.x.toFixed(3)}, {tbnCalculation.tangent.y.toFixed(3)}, {tbnCalculation.tangent.z.toFixed(3)})</div>
              </div>
              
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-green-400 mb-1">4. Bitangent (B)</div>
                <div className="text-xs">B = f × (-ΔU₂·E₁ + ΔU₁·E₂)</div>
                <div>= ({tbnCalculation.bitangent.x.toFixed(3)}, {tbnCalculation.bitangent.y.toFixed(3)}, {tbnCalculation.bitangent.z.toFixed(3)})</div>
              </div>
              
              <div className="bg-gray-900 p-2 rounded">
                <div className="text-blue-400 mb-1">5. Normal (N)</div>
                <div className="text-xs">N = E₁ × E₂ (外積)</div>
                <div>= ({tbnCalculation.normal.x.toFixed(3)}, {tbnCalculation.normal.y.toFixed(3)}, {tbnCalculation.normal.z.toFixed(3)})</div>
              </div>
            </div>
          )}
          
          {/* TBN行列表示 */}
          <div className="mt-4 bg-gray-900 p-3 rounded">
            <div className="text-cyan-400 mb-2 font-semibold">TBN行列</div>
            <div className="font-mono text-xs">
              <div className="flex justify-center gap-1">
                <span className="text-gray-500">[</span>
                <span className="text-red-400 w-16 text-right">{tbnCalculation.tangent.x.toFixed(3)}</span>
                <span className="text-green-400 w-16 text-right">{tbnCalculation.bitangent.x.toFixed(3)}</span>
                <span className="text-blue-400 w-16 text-right">{tbnCalculation.normal.x.toFixed(3)}</span>
                <span className="text-gray-500">]</span>
              </div>
              <div className="flex justify-center gap-1">
                <span className="text-gray-500">[</span>
                <span className="text-red-400 w-16 text-right">{tbnCalculation.tangent.y.toFixed(3)}</span>
                <span className="text-green-400 w-16 text-right">{tbnCalculation.bitangent.y.toFixed(3)}</span>
                <span className="text-blue-400 w-16 text-right">{tbnCalculation.normal.y.toFixed(3)}</span>
                <span className="text-gray-500">]</span>
              </div>
              <div className="flex justify-center gap-1">
                <span className="text-gray-500">[</span>
                <span className="text-red-400 w-16 text-right">{tbnCalculation.tangent.z.toFixed(3)}</span>
                <span className="text-green-400 w-16 text-right">{tbnCalculation.bitangent.z.toFixed(3)}</span>
                <span className="text-blue-400 w-16 text-right">{tbnCalculation.normal.z.toFixed(3)}</span>
                <span className="text-gray-500">]</span>
              </div>
              <div className="flex justify-center gap-1 mt-1 text-gray-500">
                <span className="w-4"></span>
                <span className="w-16 text-center text-red-400">T</span>
                <span className="w-16 text-center text-green-400">B</span>
                <span className="w-16 text-center text-blue-400">N</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 解説 */}
      <div className="mt-6 max-w-4xl mx-auto bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-cyan-300 mb-2">TBN行列とは</h2>
        <div className="text-sm text-gray-300 space-y-2">
          <p>
            <span className="text-red-400 font-bold">Tangent（接線）</span>: テクスチャのU方向に対応するワールド空間のベクトル
          </p>
          <p>
            <span className="text-green-400 font-bold">Bitangent（従接線）</span>: テクスチャのV方向に対応するワールド空間のベクトル
          </p>
          <p>
            <span className="text-blue-400 font-bold">Normal（法線）</span>: サーフェスに垂直なベクトル
          </p>
          <p className="mt-3 text-cyan-200">
            この行列は<span className="font-bold">ノーマルマップ</span>をワールド空間に変換するために使用されます。
            ノーマルマップはタンジェント空間で定義されているため、正しいライティング計算にはTBN行列による変換が必要です。
          </p>
        </div>
      </div>
    </div>
  );
};

export default TBNVisualization;