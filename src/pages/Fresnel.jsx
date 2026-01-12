import React, { useState, useMemo } from 'react';

const FresnelVisualization = () => {
  const [viewAngle, setViewAngle] = useState(60);
  const [ior, setIor] = useState(1.5); // Index of Refraction
  const [f0Custom, setF0Custom] = useState(0.04);
  const [useSchlick, setUseSchlick] = useState(true);
  const [materialPreset, setMaterialPreset] = useState('dielectric');
  const [sphereRotation, setSphereRotation] = useState({ x: 15, y: -30 });
  const [isDragging, setIsDragging] = useState(null);

  // マテリアルプリセット
  const materials = {
    dielectric: { name: '誘電体 (ガラス等)', f0: 0.04, color: '#88ccff', ior: 1.5 },
    water: { name: '水', f0: 0.02, color: '#4488ff', ior: 1.33 },
    plastic: { name: 'プラスチック', f0: 0.04, color: '#ff8888', ior: 1.46 },
    diamond: { name: 'ダイヤモンド', f0: 0.17, color: '#ffffff', ior: 2.42 },
    gold: { name: '金 (金属)', f0: 0.95, color: '#ffd700', ior: 0.47 },
    copper: { name: '銅 (金属)', f0: 0.95, color: '#ff7744', ior: 0.46 },
    iron: { name: '鉄 (金属)', f0: 0.56, color: '#aaaaaa', ior: 2.95 },
  };

  const currentMaterial = materials[materialPreset];
  const f0 = materialPreset === 'custom' ? f0Custom : currentMaterial.f0;

  // 角度計算
  const thetaRad = (viewAngle * Math.PI) / 180;
  const cosTheta = Math.cos(thetaRad);

  // Schlick近似
  const fresnelSchlick = f0 + (1 - f0) * Math.pow(1 - cosTheta, 5);

  // 正確なフレネル方程式（非偏光）
  const fresnelExact = useMemo(() => {
    const n1 = 1.0; // 空気
    const n2 = ior;
    const cosThetaI = cosTheta;
    const sinThetaI = Math.sin(thetaRad);
    const sinThetaT = (n1 / n2) * sinThetaI;
    
    // 全反射チェック
    if (sinThetaT > 1) return 1.0;
    
    const cosThetaT = Math.sqrt(1 - sinThetaT * sinThetaT);
    
    // s偏光 (TE)
    const rs = (n1 * cosThetaI - n2 * cosThetaT) / (n1 * cosThetaI + n2 * cosThetaT);
    // p偏光 (TM)
    const rp = (n2 * cosThetaI - n1 * cosThetaT) / (n2 * cosThetaI + n1 * cosThetaT);
    
    // 非偏光の反射率
    return (rs * rs + rp * rp) / 2;
  }, [cosTheta, thetaRad, ior]);

  const fresnel = useSchlick ? fresnelSchlick : fresnelExact;

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
    
    return { x: 200 + x2 * scale, y: 200 - y2 * scale, z: z2 };
  };

  // 視線方向（カメラから見た方向）
  const viewDir = { x: 0, y: 0, z: 1 };

  // 球体パッチ生成
  const spherePatches = useMemo(() => {
    const patches = [];
    const segments = 32;
    const rings = 24;
    
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const phi0 = (Math.PI * i) / rings;
        const phi1 = (Math.PI * (i + 1)) / rings;
        const theta0 = (2 * Math.PI * j) / segments;
        const theta1 = (2 * Math.PI * (j + 1)) / segments;
        
        const getPoint = (phi, theta) => ({
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.cos(phi),
          z: Math.sin(phi) * Math.sin(theta)
        });
        
        const p00 = getPoint(phi0, theta0);
        const p01 = getPoint(phi0, theta1);
        const p10 = getPoint(phi1, theta0);
        const p11 = getPoint(phi1, theta1);
        
        // 中心点の法線（球体なので位置=法線）
        const centerNormal = {
          x: (p00.x + p01.x + p10.x + p11.x) / 4,
          y: (p00.y + p01.y + p10.y + p11.y) / 4,
          z: (p00.z + p01.z + p10.z + p11.z) / 4
        };
        const len = Math.sqrt(centerNormal.x**2 + centerNormal.y**2 + centerNormal.z**2);
        centerNormal.x /= len;
        centerNormal.y /= len;
        centerNormal.z /= len;
        
        // N·V（法線と視線のドット積）
        const NdotV = Math.max(0, centerNormal.x * viewDir.x + centerNormal.y * viewDir.y + centerNormal.z * viewDir.z);
        
        // フレネル計算
        const fresnelValue = f0 + (1 - f0) * Math.pow(1 - NdotV, 5);
        
        const proj00 = projectSphere(p00);
        const proj01 = projectSphere(p01);
        const proj10 = projectSphere(p10);
        const proj11 = projectSphere(p11);
        
        const avgZ = (proj00.z + proj01.z + proj10.z + proj11.z) / 4;
        
        patches.push({
          points: `${proj00.x},${proj00.y} ${proj01.x},${proj01.y} ${proj11.x},${proj11.y} ${proj10.x},${proj10.y}`,
          z: avgZ,
          fresnel: fresnelValue,
          NdotV
        });
      }
    }
    
    return patches.sort((a, b) => a.z - b.z);
  }, [sphereRotation, f0, viewDir]);

  // フレネル値から色を生成
  const getFresnelColor = (fresnelVal, baseColor = currentMaterial.color) => {
    // ベースカラーをRGBに変換
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // フレネル反射（白に近づく）とベースカラーをミックス
    const mixR = Math.round(r * (1 - fresnelVal) + 255 * fresnelVal);
    const mixG = Math.round(g * (1 - fresnelVal) + 255 * fresnelVal);
    const mixB = Math.round(b * (1 - fresnelVal) + 255 * fresnelVal);
    
    return `rgb(${mixR}, ${mixG}, ${mixB})`;
  };

  // 2Dビュー用の座標
  const centerX = 200;
  const centerY = 250;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-4 text-cyan-400">
        フレネル効果の可視化
      </h1>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* 2Dビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">視線角度と反射率</h2>
          <svg width="400" height="350" className="bg-gray-950 rounded">
            {/* サーフェス */}
            <rect x="50" y={centerY} width="300" height="80" fill="#334" />
            <line x1="50" y1={centerY} x2="350" y2={centerY} stroke="#666" strokeWidth="2" />
            
            {/* 反射光のグラデーション */}
            <defs>
              <linearGradient id="surfaceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getFresnelColor(0.04)} />
                <stop offset="50%" stopColor={getFresnelColor(0.3)} />
                <stop offset="100%" stopColor={getFresnelColor(1)} />
              </linearGradient>
            </defs>
            <rect x="50" y={centerY - 3} width="300" height="6" fill="url(#surfaceGradient)" />
            
            {/* 法線 */}
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY - 100}
              stroke="#44ff44"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <text x={centerX + 10} y={centerY - 90} fill="#44ff44" fontSize="14">N</text>
            
            {/* 入射光 */}
            <line
              x1={centerX - Math.sin(thetaRad) * 120}
              y1={centerY - Math.cos(thetaRad) * 120}
              x2={centerX}
              y2={centerY}
              stroke="#ffff44"
              strokeWidth="3"
            />
            <circle
              cx={centerX - Math.sin(thetaRad) * 130}
              cy={centerY - Math.cos(thetaRad) * 130}
              r="10"
              fill="#ffff00"
            />
            
            {/* 視線/反射光 */}
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX + Math.sin(thetaRad) * 120}
              y2={centerY - Math.cos(thetaRad) * 120}
              stroke={getFresnelColor(fresnel)}
              strokeWidth={3 + fresnel * 5}
            />
            <text
              x={centerX + Math.sin(thetaRad) * 130}
              y={centerY - Math.cos(thetaRad) * 130}
              fill="#fff"
              fontSize="12"
            >
              V (視線)
            </text>
            
            {/* 屈折光（誘電体のみ） */}
            {f0 < 0.5 && (
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + Math.sin(thetaRad * 0.7) * 60}
                y2={centerY + Math.cos(thetaRad * 0.7) * 60}
                stroke={currentMaterial.color}
                strokeWidth={2}
                opacity={1 - fresnel}
              />
            )}
            
            {/* 角度表示 */}
            <path
              d={`M ${centerX} ${centerY - 40} A 40 40 0 0 1 ${centerX + Math.sin(thetaRad) * 40} ${centerY - Math.cos(thetaRad) * 40}`}
              fill="none"
              stroke="#ffa500"
              strokeWidth="2"
            />
            <text
              x={centerX + 25}
              y={centerY - 50}
              fill="#ffa500"
              fontSize="14"
            >
              θ = {viewAngle}°
            </text>
            
            {/* 凡例 */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="120" height="70" fill="#222" rx="5" />
              <circle cx="15" cy="20" r="8" fill="#ffff00" />
              <text x="30" y="25" fill="#fff" fontSize="11">入射光</text>
              <line x1="5" y1="45" x2="25" y2="45" stroke="#44ff44" strokeWidth="2" strokeDasharray="3,3" />
              <text x="30" y="50" fill="#fff" fontSize="11">法線 N</text>
            </g>
            
            {/* 反射率バー */}
            <g transform="translate(50, 300)">
              <text x="0" y="0" fill="#888" fontSize="12">反射率</text>
              <rect x="60" y="-12" width="200" height="16" fill="#333" rx="2" />
              <rect x="60" y="-12" width={200 * fresnel} height="16" fill={getFresnelColor(fresnel)} rx="2" />
              <text x="270" y="0" fill="#fff" fontSize="12">{(fresnel * 100).toFixed(1)}%</text>
            </g>
          </svg>
          
          {/* 角度スライダー */}
          <div className="mt-3">
            <label className="block text-sm text-orange-400 mb-1">
              視線角度 θ: {viewAngle}° (grazing: 90°)
            </label>
            <input
              type="range"
              min="0"
              max="89"
              value={viewAngle}
              onChange={(e) => setViewAngle(Number(e.target.value))}
              className="w-full accent-orange-400"
            />
          </div>
        </div>

        {/* 3D球体ビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">3D球体（エッジで反射増加）</h2>
          <svg
            width="400"
            height="400"
            className="bg-gray-950 rounded cursor-move"
            onMouseDown={(e) => setIsDragging({ x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => {
              if (isDragging) {
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
                fill={getFresnelColor(patch.fresnel)}
                stroke={getFresnelColor(patch.fresnel)}
                strokeWidth="0.5"
              />
            ))}
            
            {/* フレネルリング（エッジの強調） */}
            <circle
              cx="200"
              cy="200"
              r="100"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="20"
              style={{ filter: 'blur(10px)' }}
            />
            
            {/* ラベル */}
            <text x="200" y="30" fill="#888" fontSize="12" textAnchor="middle">
              中心: N·V ≈ 1 → F ≈ F₀
            </text>
            <text x="200" y="380" fill="#fff" fontSize="12" textAnchor="middle">
              エッジ: N·V ≈ 0 → F → 1
            </text>
          </svg>
          
          <div className="mt-2 text-sm text-gray-400 text-center">
            ドラッグで回転 | エッジほど反射が強い
          </div>
        </div>

        {/* 計算パネル */}
        <div className="bg-gray-800 rounded-lg p-4 w-80">
          <h2 className="text-lg font-semibold mb-3 text-cyan-300">フレネル計算</h2>
          
          {/* マテリアル選択 */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">マテリアル</label>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(materials).map(([key, mat]) => (
                <button
                  key={key}
                  onClick={() => setMaterialPreset(key)}
                  className={`px-2 py-1 text-xs rounded flex items-center gap-1 ${
                    materialPreset === key ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: mat.color }}
                  />
                  {mat.name}
                </button>
              ))}
            </div>
          </div>

          {/* F0値 */}
          <div className="bg-gray-900 p-3 rounded mb-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-cyan-400">F₀ (基本反射率)</span>
              <span className="font-mono text-lg">{f0.toFixed(3)}</span>
            </div>
            <div className="text-xs text-gray-400">
              垂直入射時 (θ=0°) の反射率
            </div>
            <div className="mt-2 h-4 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gray-600 to-white"
                style={{ width: `${f0 * 100}%` }}
              />
            </div>
          </div>

          {/* 計算方式切り替え */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setUseSchlick(true)}
              className={`flex-1 px-2 py-1 text-sm rounded ${useSchlick ? 'bg-cyan-600' : 'bg-gray-700'}`}
            >
              Schlick近似
            </button>
            <button
              onClick={() => setUseSchlick(false)}
              className={`flex-1 px-2 py-1 text-sm rounded ${!useSchlick ? 'bg-cyan-600' : 'bg-gray-700'}`}
            >
              正確な式
            </button>
          </div>

          {/* 数式表示 */}
          <div className="bg-gray-900 p-3 rounded mb-3">
            <div className="text-cyan-300 mb-2 font-semibold">
              {useSchlick ? 'Schlick近似式' : 'フレネル方程式'}
            </div>
            {useSchlick ? (
              <div className="text-sm font-mono space-y-1">
                <div className="text-white">
                  F = F₀ + (1 - F₀)(1 - cos θ)⁵
                </div>
                <div className="text-gray-400 text-xs mt-2">
                  = {f0.toFixed(3)} + (1 - {f0.toFixed(3)})(1 - {cosTheta.toFixed(3)})⁵
                </div>
                <div className="text-gray-400 text-xs">
                  = {f0.toFixed(3)} + {(1-f0).toFixed(3)} × {Math.pow(1 - cosTheta, 5).toFixed(4)}
                </div>
                <div className="text-cyan-400 text-lg mt-1">
                  = {fresnelSchlick.toFixed(4)}
                </div>
              </div>
            ) : (
              <div className="text-sm font-mono space-y-1">
                <div className="text-white text-xs">
                  Rs = ((n₁cosθᵢ - n₂cosθₜ) / (n₁cosθᵢ + n₂cosθₜ))²
                </div>
                <div className="text-white text-xs">
                  Rp = ((n₂cosθᵢ - n₁cosθₜ) / (n₂cosθᵢ + n₁cosθₜ))²
                </div>
                <div className="text-white text-xs mt-1">
                  F = (Rs + Rp) / 2
                </div>
                <div className="text-cyan-400 text-lg mt-2">
                  = {fresnelExact.toFixed(4)}
                </div>
              </div>
            )}
          </div>

          {/* 結果表示 */}
          <div className="bg-gray-900 p-3 rounded border-2 border-cyan-500">
            <div className="flex justify-between items-center">
              <span className="text-cyan-400">反射率 F</span>
              <span className="text-2xl font-bold">{(fresnel * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-gray-400">透過率 (1-F)</span>
              <span className="text-lg">{((1 - fresnel) * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* IOR調整（正確な式の場合） */}
          {!useSchlick && (
            <div className="mt-3">
              <label className="block text-sm text-gray-400 mb-1">
                屈折率 (IOR): {ior.toFixed(2)}
              </label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={ior}
                onChange={(e) => setIor(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>
          )}
        </div>
      </div>

      {/* グラフ */}
      <div className="mt-6 max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3 text-cyan-300">角度による反射率の変化</h2>
          <svg width="100%" height="300" viewBox="0 0 600 300" className="bg-gray-950 rounded">
            {/* グリッド */}
            {[0, 15, 30, 45, 60, 75, 90].map(angle => (
              <g key={angle}>
                <line x1={50 + (angle / 90) * 500} y1={30} x2={50 + (angle / 90) * 500} y2={250} stroke="#333" />
                <text x={50 + (angle / 90) * 500} y={270} fill="#666" fontSize="12" textAnchor="middle">{angle}°</text>
              </g>
            ))}
            {[0, 0.25, 0.5, 0.75, 1].map(val => (
              <g key={val}>
                <line x1={50} y1={250 - val * 220} x2={550} y2={250 - val * 220} stroke="#333" />
                <text x={40} y={255 - val * 220} fill="#666" fontSize="10" textAnchor="end">{(val * 100).toFixed(0)}%</text>
              </g>
            ))}
            
            {/* 各マテリアルの曲線 */}
            {Object.entries(materials).map(([key, mat]) => {
              const path = Array.from({ length: 90 }, (_, i) => {
                const theta = (i * Math.PI) / 180;
                const cosT = Math.cos(theta);
                const f = mat.f0 + (1 - mat.f0) * Math.pow(1 - cosT, 5);
                const x = 50 + (i / 90) * 500;
                const y = 250 - f * 220;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ');
              
              return (
                <path
                  key={key}
                  d={path}
                  fill="none"
                  stroke={mat.color}
                  strokeWidth={materialPreset === key ? 3 : 1.5}
                  opacity={materialPreset === key ? 1 : 0.4}
                />
              );
            })}
            
            {/* 現在位置 */}
            <circle
              cx={50 + (viewAngle / 90) * 500}
              cy={250 - fresnel * 220}
              r="8"
              fill="#ff4444"
              stroke="white"
              strokeWidth="2"
            />
            
            {/* 凡例 */}
            <g transform="translate(460, 40)">
              {Object.entries(materials).slice(0, 5).map(([key, mat], i) => (
                <g key={key} transform={`translate(0, ${i * 18})`}>
                  <line x1="0" y1="0" x2="20" y2="0" stroke={mat.color} strokeWidth="2" />
                  <text x="25" y="4" fill="#888" fontSize="10">{mat.name}</text>
                </g>
              ))}
            </g>
            
            {/* 軸ラベル */}
            <text x="300" y="295" fill="#888" fontSize="12" textAnchor="middle">視線角度 θ (grazing angle)</text>
            <text x="15" y="140" fill="#888" fontSize="12" textAnchor="middle" transform="rotate(-90, 15, 140)">反射率 F</text>
          </svg>
        </div>
      </div>

      {/* 解説 */}
      <div className="mt-6 max-w-4xl mx-auto bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-cyan-300 mb-3">フレネル効果とは</h2>
        <div className="text-sm text-gray-300 space-y-3">
          <p>
            <span className="text-cyan-400 font-bold">フレネル効果</span>は、視線角度によって反射率が変化する現象です。
            斜めから見ると（grazing angle）、どんな物体でも反射が強くなります。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-cyan-400 font-semibold mb-2">Schlick近似（リアルタイム向け）</div>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded">
                F = F₀ + (1 - F₀)(1 - N·V)⁵
              </div>
              <p className="text-xs mt-2 text-gray-400">
                計算が軽く、視覚的に十分な精度。ゲームやWebGPUで標準的に使用。
              </p>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-cyan-400 font-semibold mb-2">F₀の求め方</div>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded">
                F₀ = ((n₁ - n₂) / (n₁ + n₂))²
              </div>
              <p className="text-xs mt-2 text-gray-400">
                屈折率(IOR)から基本反射率を計算。水(1.33)→0.02、ガラス(1.5)→0.04
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">👁️↓</div>
              <div className="text-green-400">θ ≈ 0° (正面)</div>
              <div>F ≈ F₀</div>
              <div className="text-xs text-gray-400">基本反射率のみ</div>
            </div>
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">👁️↘</div>
              <div className="text-yellow-400">θ ≈ 60°</div>
              <div>F 増加中</div>
              <div className="text-xs text-gray-400">反射が目立ち始める</div>
            </div>
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">👁️→</div>
              <div className="text-red-400">θ → 90° (grazing)</div>
              <div>F → 100%</div>
              <div className="text-xs text-gray-400">完全反射</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FresnelVisualization;