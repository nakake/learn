import React, { useState, useMemo } from 'react';

const DotProductLighting = () => {
  const [lightAngle, setLightAngle] = useState(45);
  const [surfaceAngle, setSurfaceAngle] = useState(0);
  const [showFormula, setShowFormula] = useState(true);
  const [visualMode, setVisualMode] = useState('2d'); // '2d' or 'sphere'
  const [isDragging, setIsDragging] = useState(null);
  const [sphereRotation, setSphereRotation] = useState({ x: 20, y: -30 });

  // 角度をラジアンに変換
  const lightRad = (lightAngle * Math.PI) / 180;
  const surfaceRad = (surfaceAngle * Math.PI) / 180;

  // ベクトル計算
  const lightDir = useMemo(() => ({
    x: Math.cos(lightRad),
    y: Math.sin(lightRad)
  }), [lightRad]);

  const normal = useMemo(() => ({
    x: Math.cos(surfaceRad + Math.PI / 2),
    y: Math.sin(surfaceRad + Math.PI / 2)
  }), [surfaceRad]);

  // ドット積計算
  const dotProduct = lightDir.x * normal.x + lightDir.y * normal.y;
  const intensity = Math.max(0, dotProduct); // クランプ
  const angleBetween = Math.acos(Math.min(1, Math.max(-1, dotProduct))) * 180 / Math.PI;

  // 2Dビュー用の座標
  const centerX = 200;
  const centerY = 200;
  const vectorLength = 120;

  // サーフェスの端点
  const surfaceStart = {
    x: centerX - Math.cos(surfaceRad) * 100,
    y: centerY + Math.sin(surfaceRad) * 100
  };
  const surfaceEnd = {
    x: centerX + Math.cos(surfaceRad) * 100,
    y: centerY - Math.sin(surfaceRad) * 100
  };

  // 法線ベクトルの端点
  const normalEnd = {
    x: centerX + normal.x * vectorLength,
    y: centerY - normal.y * vectorLength
  };

  // 光源ベクトルの端点（逆方向=光が来る方向）
  const lightEnd = {
    x: centerX + lightDir.x * vectorLength,
    y: centerY - lightDir.y * vectorLength
  };

  // ドラッグハンドラー
  const handleMouseMove = (e, svgRef) => {
    if (!isDragging) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left - centerX;
    const y = -(e.clientY - rect.top - centerY);
    
    if (isDragging === 'light') {
      const angle = Math.atan2(y, x) * 180 / Math.PI;
      setLightAngle(angle);
    } else if (isDragging === 'surface') {
      const angle = Math.atan2(y, x) * 180 / Math.PI - 90;
      setSurfaceAngle(angle);
    }
  };

  // 球体の3D投影
  const projectSphere = (point, scale = 100) => {
    const radX = (sphereRotation.x * Math.PI) / 180;
    const radY = (sphereRotation.y * Math.PI) / 180;
    
    const x1 = point.x * Math.cos(radY) - point.z * Math.sin(radY);
    const z1 = point.x * Math.sin(radY) + point.z * Math.cos(radY);
    const y1 = point.y;
    
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
    const x2 = x1;
    
    return {
      x: 200 + x2 * scale,
      y: 200 - y2 * scale,
      z: z2
    };
  };

  // 球体上の点を生成
  const spherePoints = useMemo(() => {
    const points = [];
    const segments = 24;
    const rings = 16;
    
    // 光源方向（3D）
    const light3D = {
      x: Math.cos(lightRad),
      y: Math.sin(lightRad),
      z: 0
    };
    
    for (let i = 0; i <= rings; i++) {
      const phi = (Math.PI * i) / rings;
      for (let j = 0; j <= segments; j++) {
        const theta = (2 * Math.PI * j) / segments;
        
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        
        // この点での法線は球体なのでそのまま位置ベクトル
        const dot = x * light3D.x + y * light3D.y + z * light3D.z;
        const intensity = Math.max(0, dot);
        
        points.push({
          pos: { x, y, z },
          intensity,
          phi,
          theta
        });
      }
    }
    return points;
  }, [lightRad]);

  // 強度に応じた色を生成
  const getIntensityColor = (i, alpha = 1) => {
    const r = Math.round(50 + i * 205);
    const g = Math.round(50 + i * 180);
    const b = Math.round(80 + i * 120);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // 球体描画用のパッチを生成
  const spherePatches = useMemo(() => {
    const patches = [];
    const segments = 24;
    const rings = 16;
    
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const idx00 = i * (segments + 1) + j;
        const idx01 = i * (segments + 1) + j + 1;
        const idx10 = (i + 1) * (segments + 1) + j;
        const idx11 = (i + 1) * (segments + 1) + j + 1;
        
        const p00 = spherePoints[idx00];
        const p01 = spherePoints[idx01];
        const p10 = spherePoints[idx10];
        const p11 = spherePoints[idx11];
        
        if (!p00 || !p01 || !p10 || !p11) continue;
        
        const proj00 = projectSphere(p00.pos);
        const proj01 = projectSphere(p01.pos);
        const proj10 = projectSphere(p10.pos);
        const proj11 = projectSphere(p11.pos);
        
        const avgZ = (proj00.z + proj01.z + proj10.z + proj11.z) / 4;
        const avgIntensity = (p00.intensity + p01.intensity + p10.intensity + p11.intensity) / 4;
        
        patches.push({
          points: `${proj00.x},${proj00.y} ${proj01.x},${proj01.y} ${proj11.x},${proj11.y} ${proj10.x},${proj10.y}`,
          z: avgZ,
          intensity: avgIntensity
        });
      }
    }
    
    // Z順でソート（奥から描画）
    return patches.sort((a, b) => a.z - b.z);
  }, [spherePoints, sphereRotation]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-4 text-cyan-400">
        ドット積による光の強度計算
      </h1>

      {/* モード切り替え */}
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => setVisualMode('2d')}
          className={`px-4 py-2 rounded ${visualMode === '2d' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          2Dベクトル図
        </button>
        <button
          onClick={() => setVisualMode('sphere')}
          className={`px-4 py-2 rounded ${visualMode === 'sphere' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        >
          3D球体
        </button>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* メインビジュアル */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">
            {visualMode === '2d' ? 'ベクトル図（ドラッグで操作）' : '球体シェーディング'}
          </h2>
          
          {visualMode === '2d' ? (
            <svg
              width="400"
              height="400"
              className="bg-gray-950 rounded cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseUp={() => setIsDragging(null)}
              onMouseLeave={() => setIsDragging(null)}
            >
              {/* 背景グラデーション（強度表示） */}
              <defs>
                <radialGradient id="intensityGlow">
                  <stop offset="0%" stopColor={getIntensityColor(intensity, 0.3)} />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx={centerX} cy={centerY} r="150" fill="url(#intensityGlow)" />
              
              {/* サーフェス（面） */}
              <line
                x1={surfaceStart.x}
                y1={surfaceStart.y}
                x2={surfaceEnd.x}
                y2={surfaceEnd.y}
                stroke={getIntensityColor(intensity)}
                strokeWidth="8"
                strokeLinecap="round"
                style={{ cursor: 'grab' }}
                onMouseDown={() => setIsDragging('surface')}
              />
              
              {/* サーフェスの輝き */}
              <line
                x1={surfaceStart.x}
                y1={surfaceStart.y}
                x2={surfaceEnd.x}
                y2={surfaceEnd.y}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                opacity={intensity * 0.5}
                pointerEvents="none"
              />

              {/* 角度の弧 */}
              {dotProduct > -0.99 && (
                <path
                  d={`M ${centerX + normal.x * 40} ${centerY - normal.y * 40} 
                      A 40 40 0 ${angleBetween > 180 ? 1 : 0} ${dotProduct < 0 ? 1 : 0} 
                      ${centerX + lightDir.x * 40} ${centerY - lightDir.y * 40}`}
                  fill="none"
                  stroke="#ffa500"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              )}
              
              {/* 法線ベクトル (N) */}
              <line
                x1={centerX}
                y1={centerY}
                x2={normalEnd.x}
                y2={normalEnd.y}
                stroke="#44ff44"
                strokeWidth="3"
              />
              <polygon
                points={`${normalEnd.x},${normalEnd.y} 
                  ${normalEnd.x - 10 * Math.cos(surfaceRad + Math.PI/2 - 0.4)},${normalEnd.y + 10 * Math.sin(surfaceRad + Math.PI/2 - 0.4)}
                  ${normalEnd.x - 10 * Math.cos(surfaceRad + Math.PI/2 + 0.4)},${normalEnd.y + 10 * Math.sin(surfaceRad + Math.PI/2 + 0.4)}`}
                fill="#44ff44"
              />
              <text x={normalEnd.x + 10} y={normalEnd.y - 10} fill="#44ff44" fontSize="16" fontWeight="bold">N</text>
              
              {/* 光源方向ベクトル (L) */}
              <line
                x1={centerX}
                y1={centerY}
                x2={lightEnd.x}
                y2={lightEnd.y}
                stroke="#ffff44"
                strokeWidth="3"
                style={{ cursor: 'grab' }}
                onMouseDown={() => setIsDragging('light')}
              />
              <polygon
                points={`${lightEnd.x},${lightEnd.y} 
                  ${lightEnd.x - 10 * Math.cos(lightRad - 0.4)},${lightEnd.y + 10 * Math.sin(lightRad - 0.4)}
                  ${lightEnd.x - 10 * Math.cos(lightRad + 0.4)},${lightEnd.y + 10 * Math.sin(lightRad + 0.4)}`}
                fill="#ffff44"
              />
              <text x={lightEnd.x + 10} y={lightEnd.y - 10} fill="#ffff44" fontSize="16" fontWeight="bold">L</text>
              
              {/* 光源アイコン */}
              <circle
                cx={centerX + lightDir.x * (vectorLength + 30)}
                cy={centerY - lightDir.y * (vectorLength + 30)}
                r="15"
                fill="#ffff00"
                opacity="0.8"
              />
              <circle
                cx={centerX + lightDir.x * (vectorLength + 30)}
                cy={centerY - lightDir.y * (vectorLength + 30)}
                r="20"
                fill="none"
                stroke="#ffff00"
                strokeWidth="2"
                opacity="0.4"
              />

              {/* 角度表示 */}
              <text x={centerX + 50} y={centerY - 50} fill="#ffa500" fontSize="14">
                θ = {angleBetween.toFixed(1)}°
              </text>

              {/* 凡例 */}
              <g transform="translate(10, 350)">
                <line x1="0" y1="0" x2="30" y2="0" stroke="#44ff44" strokeWidth="3" />
                <text x="35" y="5" fill="#44ff44" fontSize="12">法線 (N)</text>
                <line x1="0" y1="20" x2="30" y2="20" stroke="#ffff44" strokeWidth="3" />
                <text x="35" y="25" fill="#ffff44" fontSize="12">光源方向 (L)</text>
              </g>
            </svg>
          ) : (
            <svg
              width="400"
              height="400"
              className="bg-gray-950 rounded cursor-move"
              onMouseDown={(e) => {
                setIsDragging('sphere');
                setIsDragging({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (isDragging && isDragging.x !== undefined) {
                  const dx = e.clientX - isDragging.x;
                  const dy = e.clientY - isDragging.y;
                  setSphereRotation(prev => ({
                    x: Math.max(-90, Math.min(90, prev.x + dy * 0.5)),
                    y: prev.y + dx * 0.5
                  }));
                  setIsDragging({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseUp={() => setIsDragging(null)}
              onMouseLeave={() => setIsDragging(null)}
            >
              {/* 球体パッチ */}
              {spherePatches.map((patch, i) => (
                <polygon
                  key={i}
                  points={patch.points}
                  fill={getIntensityColor(patch.intensity)}
                  stroke={getIntensityColor(patch.intensity)}
                  strokeWidth="0.5"
                />
              ))}
              
              {/* 光源方向矢印 */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ffff44" />
                </marker>
              </defs>
              <line
                x1={200 + Math.cos(lightRad) * 140}
                y1={200 - Math.sin(lightRad) * 140}
                x2={200 + Math.cos(lightRad) * 180}
                y2={200 - Math.sin(lightRad) * 180}
                stroke="#ffff44"
                strokeWidth="3"
                markerEnd="url(#arrowhead)"
              />
              <circle
                cx={200 + Math.cos(lightRad) * 170}
                cy={200 - Math.sin(lightRad) * 170}
                r="12"
                fill="#ffff00"
                opacity="0.8"
              />
              <text
                x={200 + Math.cos(lightRad) * 190}
                y={200 - Math.sin(lightRad) * 190}
                fill="#ffff44"
                fontSize="14"
                fontWeight="bold"
              >
                Light
              </text>
            </svg>
          )}

          {/* コントロール */}
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm text-yellow-400 mb-1">
                光源角度: {lightAngle.toFixed(0)}°
              </label>
              <input
                type="range"
                min="-180"
                max="180"
                value={lightAngle}
                onChange={(e) => setLightAngle(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
            </div>
            {visualMode === '2d' && (
              <div>
                <label className="block text-sm text-green-400 mb-1">
                  サーフェス角度: {surfaceAngle.toFixed(0)}°
                </label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  value={surfaceAngle}
                  onChange={(e) => setSurfaceAngle(Number(e.target.value))}
                  className="w-full accent-green-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* 計算結果パネル */}
        <div className="bg-gray-800 rounded-lg p-4 w-80">
          <h2 className="text-lg font-semibold mb-3 text-cyan-300">計算結果</h2>
          
          {/* 強度メーター */}
          <div className="mb-4">
            <div className="text-sm text-gray-400 mb-1">光の強度 (Intensity)</div>
            <div className="relative h-8 bg-gray-900 rounded overflow-hidden">
              <div
                className="h-full transition-all duration-100"
                style={{
                  width: `${intensity * 100}%`,
                  background: `linear-gradient(90deg, ${getIntensityColor(0.3)}, ${getIntensityColor(1)})`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
                {(intensity * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* 数値表示 */}
          <div className="space-y-3 font-mono text-sm">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-yellow-400 mb-1">光源方向 L</div>
              <div>({lightDir.x.toFixed(3)}, {lightDir.y.toFixed(3)})</div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-green-400 mb-1">法線 N</div>
              <div>({normal.x.toFixed(3)}, {normal.y.toFixed(3)})</div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-orange-400 mb-1">ベクトル間の角度 θ</div>
              <div className="text-2xl">{angleBetween.toFixed(1)}°</div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded border-2 border-cyan-500">
              <div className="text-cyan-400 mb-1">ドット積 N · L</div>
              <div className="text-2xl">{dotProduct.toFixed(4)}</div>
              {dotProduct < 0 && (
                <div className="text-red-400 text-xs mt-1">
                  ※ 負の値 → 裏面なので 0 にクランプ
                </div>
              )}
            </div>
          </div>

          {/* 数式表示 */}
          {showFormula && (
            <div className="mt-4 bg-gray-900 p-3 rounded">
              <div className="text-cyan-300 mb-2 font-semibold">計算式</div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-gray-400">ドット積:</span>
                  <div className="ml-2 text-white">
                    N · L = Nx×Lx + Ny×Ly
                  </div>
                  <div className="ml-2 text-gray-300">
                    = {normal.x.toFixed(2)}×{lightDir.x.toFixed(2)} + {normal.y.toFixed(2)}×{lightDir.y.toFixed(2)}
                  </div>
                  <div className="ml-2 text-cyan-400 font-bold">
                    = {dotProduct.toFixed(4)}
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <span className="text-gray-400">幾何学的解釈:</span>
                  <div className="ml-2 text-white">
                    N · L = |N| × |L| × cos(θ)
                  </div>
                  <div className="ml-2 text-gray-300">
                    = 1 × 1 × cos({angleBetween.toFixed(1)}°)
                  </div>
                  <div className="ml-2 text-cyan-400 font-bold">
                    = {dotProduct.toFixed(4)}
                  </div>
                </div>
                <div className="border-t border-gray-700 pt-2">
                  <span className="text-gray-400">最終強度:</span>
                  <div className="ml-2 text-white">
                    I = max(0, N · L)
                  </div>
                  <div className="ml-2 text-cyan-400 font-bold">
                    = {intensity.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setShowFormula(!showFormula)}
            className="mt-3 w-full text-sm px-3 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >
            {showFormula ? '数式を隠す' : '数式を表示'}
          </button>
        </div>

        {/* 強度グラフ */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">角度と強度の関係</h2>
          <svg width="300" height="200" className="bg-gray-950 rounded">
            {/* グリッド */}
            {[0, 45, 90, 135, 180].map(angle => (
              <g key={angle}>
                <line
                  x1={30 + (angle / 180) * 250}
                  y1={20}
                  x2={30 + (angle / 180) * 250}
                  y2={170}
                  stroke="#333"
                />
                <text
                  x={30 + (angle / 180) * 250}
                  y={185}
                  fill="#666"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {angle}°
                </text>
              </g>
            ))}
            {[0, 0.5, 1].map(val => (
              <g key={val}>
                <line x1={30} y1={170 - val * 150} x2={280} y2={170 - val * 150} stroke="#333" />
                <text x={25} y={175 - val * 150} fill="#666" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            ))}
            
            {/* cos曲線 */}
            <path
              d={Array.from({ length: 181 }, (_, i) => {
                const x = 30 + (i / 180) * 250;
                const y = 170 - Math.max(0, Math.cos((i * Math.PI) / 180)) * 150;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#4488ff"
              strokeWidth="2"
            />
            
            {/* 現在位置 */}
            <circle
              cx={30 + (angleBetween / 180) * 250}
              cy={170 - intensity * 150}
              r="8"
              fill="#ff4444"
              stroke="white"
              strokeWidth="2"
            />
            
            {/* ラベル */}
            <text x={150} y={15} fill="#4488ff" fontSize="12" textAnchor="middle">
              I = max(0, cos θ)
            </text>
          </svg>
          
          {/* 説明 */}
          <div className="mt-3 text-sm text-gray-400">
            <p>• θ = 0° → cos(0) = 1 (正面から光)</p>
            <p>• θ = 90° → cos(90) = 0 (光が平行)</p>
            <p>• θ &gt; 90° → 負 → 0にクランプ (裏面)</p>
          </div>
        </div>
      </div>

      {/* 解説 */}
      <div className="mt-6 max-w-4xl mx-auto bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-cyan-300 mb-2">ドット積とライティングの関係</h2>
        <div className="text-sm text-gray-300 space-y-3">
          <p>
            <span className="text-cyan-400 font-bold">ドット積（内積）</span>は、2つのベクトルの「向きの一致度」を数値化します。
            ライティングでは、<span className="text-green-400">法線N</span>と<span className="text-yellow-400">光源方向L</span>のドット積で明るさが決まります。
          </p>
          <div className="bg-gray-900 p-3 rounded font-mono">
            <span className="text-cyan-400">Intensity</span> = max(0, <span className="text-green-400">N</span> · <span className="text-yellow-400">L</span>) = max(0, cos θ)
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-gray-900 p-2 rounded text-center">
              <div className="text-2xl mb-1">🌞</div>
              <div className="text-green-400">θ = 0°</div>
              <div>完全に明るい</div>
              <div className="text-cyan-400">I = 1.0</div>
            </div>
            <div className="bg-gray-900 p-2 rounded text-center">
              <div className="text-2xl mb-1">🌤️</div>
              <div className="text-yellow-400">θ = 60°</div>
              <div>半分の明るさ</div>
              <div className="text-cyan-400">I = 0.5</div>
            </div>
            <div className="bg-gray-900 p-2 rounded text-center">
              <div className="text-2xl mb-1">🌑</div>
              <div className="text-red-400">θ ≥ 90°</div>
              <div>影（裏面）</div>
              <div className="text-cyan-400">I = 0.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DotProductLighting;