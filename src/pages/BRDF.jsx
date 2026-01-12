import React, { useState, useMemo } from 'react';

const BRDFVisualization = () => {
  const [lightAngle, setLightAngle] = useState(45);
  const [viewAngle, setViewAngle] = useState(30);
  const [roughness, setRoughness] = useState(0.3);
  const [metallic, setMetallic] = useState(0.0);
  const [f0, setF0] = useState(0.04);
  const [brdfModel, setBrdfModel] = useState('ggx'); // 'ggx', 'blinn-phong', 'lambert'
  const [showComponents, setShowComponents] = useState({ diffuse: true, specular: true });
  const [lobeRotation, setLobeRotation] = useState({ x: 20, y: -30 });
  const [isDragging, setIsDragging] = useState(null);
  const [baseColor, setBaseColor] = useState('#cc8866');

  // 角度をラジアンに
  const lightRad = (lightAngle * Math.PI) / 180;
  const viewRad = (viewAngle * Math.PI) / 180;

  // ベクトル計算
  const N = { x: 0, y: 1, z: 0 }; // 法線（上向き）
  const L = { x: Math.sin(lightRad), y: Math.cos(lightRad), z: 0 }; // 光源方向
  const V = { x: -Math.sin(viewRad), y: Math.cos(viewRad), z: 0 }; // 視線方向
  const H = useMemo(() => {
    const hx = L.x + V.x;
    const hy = L.y + V.y;
    const hz = L.z + V.z;
    const len = Math.sqrt(hx * hx + hy * hy + hz * hz);
    return { x: hx / len, y: hy / len, z: hz / len };
  }, [L, V]);

  // ドット積
  const NdotL = Math.max(0, N.x * L.x + N.y * L.y + N.z * L.z);
  const NdotV = Math.max(0, N.x * V.x + N.y * V.y + N.z * V.z);
  const NdotH = Math.max(0, N.x * H.x + N.y * H.y + N.z * H.z);
  const VdotH = Math.max(0, V.x * H.x + V.y * H.y + V.z * H.z);
  const LdotH = Math.max(0, L.x * H.x + L.y * H.y + L.z * H.z);

  // GGX/Trowbridge-Reitz 正規分布関数 (NDF)
  const D_GGX = useMemo(() => {
    const a = roughness * roughness;
    const a2 = a * a;
    const NdotH2 = NdotH * NdotH;
    const denom = NdotH2 * (a2 - 1) + 1;
    return a2 / (Math.PI * denom * denom);
  }, [roughness, NdotH]);

  // Schlick-GGX 幾何減衰関数
  const G_SchlickGGX = (NdotX, k) => {
    return NdotX / (NdotX * (1 - k) + k);
  };

  const G_Smith = useMemo(() => {
    const k = ((roughness + 1) * (roughness + 1)) / 8; // direct lighting
    return G_SchlickGGX(NdotV, k) * G_SchlickGGX(NdotL, k);
  }, [roughness, NdotV, NdotL]);

  // Schlickフレネル
  const F_Schlick = useMemo(() => {
    const f0Actual = metallic > 0.5 ? 0.9 : f0;
    return f0Actual + (1 - f0Actual) * Math.pow(1 - VdotH, 5);
  }, [f0, metallic, VdotH]);

  // Cook-Torrance スペキュラBRDF
  const specularBRDF = useMemo(() => {
    if (brdfModel === 'lambert') return 0;
    const denom = 4 * NdotV * NdotL + 0.0001;
    return (D_GGX * G_Smith * F_Schlick) / denom;
  }, [D_GGX, G_Smith, F_Schlick, NdotV, NdotL, brdfModel]);

  // Lambert ディフューズBRDF
  const diffuseBRDF = useMemo(() => {
    if (brdfModel === 'lambert') return 1 / Math.PI;
    // メタリックワークフロー: 金属はディフューズなし
    return (1 - metallic) * (1 - F_Schlick) / Math.PI;
  }, [metallic, F_Schlick, brdfModel]);

  // Blinn-Phong（比較用）
  const blinnPhongSpec = useMemo(() => {
    if (brdfModel !== 'blinn-phong') return 0;
    const shininess = Math.pow(2, (1 - roughness) * 10);
    return Math.pow(NdotH, shininess) * (shininess + 2) / (2 * Math.PI);
  }, [roughness, NdotH, brdfModel]);

  // 最終的なBRDF値
  const finalDiffuse = showComponents.diffuse ? diffuseBRDF * NdotL : 0;
  const finalSpecular = showComponents.specular ? 
    (brdfModel === 'blinn-phong' ? blinnPhongSpec : specularBRDF) * NdotL : 0;
  const finalBRDF = finalDiffuse + finalSpecular;

  // 3D投影
  const project3D = (point, scale = 80) => {
    const radX = (lobeRotation.x * Math.PI) / 180;
    const radY = (lobeRotation.y * Math.PI) / 180;
    
    const x1 = point.x * Math.cos(radY) - point.z * Math.sin(radY);
    const z1 = point.x * Math.sin(radY) + point.z * Math.cos(radY);
    const y1 = point.y;
    
    const y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
    const z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);
    const x2 = x1;
    
    return { x: 200 + x2 * scale, y: 220 - y2 * scale, z: z2 };
  };

  // BRDFローブ（反射分布）を生成
  const generateLobe = useMemo(() => {
    const points = [];
    const resolution = 60;
    
    for (let i = 0; i <= resolution; i++) {
      const theta = (i / resolution) * Math.PI; // 0 to π
      
      // この方向への反射強度を計算
      const outDir = {
        x: Math.sin(theta),
        y: Math.cos(theta),
        z: 0
      };
      
      // Hベクトル
      const hx = L.x + outDir.x;
      const hy = L.y + outDir.y;
      const hz = L.z + outDir.z;
      const hLen = Math.sqrt(hx * hx + hy * hy + hz * hz);
      const Hl = { x: hx / hLen, y: hy / hLen, z: hz / hLen };
      
      const NdotOV = Math.max(0, outDir.y);
      const NdotHl = Math.max(0, Hl.y);
      const VdotHl = Math.max(0, outDir.x * Hl.x + outDir.y * Hl.y);
      
      // GGX NDF
      const a = roughness * roughness;
      const a2 = a * a;
      const NdotH2 = NdotHl * NdotHl;
      const denom = NdotH2 * (a2 - 1) + 1;
      const D = a2 / (Math.PI * denom * denom);
      
      // 幾何減衰
      const k = ((roughness + 1) * (roughness + 1)) / 8;
      const G = G_SchlickGGX(NdotOV, k) * G_SchlickGGX(NdotL, k);
      
      // フレネル
      const f0Val = metallic > 0.5 ? 0.9 : f0;
      const F = f0Val + (1 - f0Val) * Math.pow(1 - VdotHl, 5);
      
      // スペキュラ
      const spec = NdotL > 0 && NdotOV > 0 ? 
        (D * G * F) / (4 * NdotOV * NdotL + 0.0001) : 0;
      
      // ディフューズ
      const diff = (1 - metallic) * (1 - F) / Math.PI;
      
      const intensity = Math.min(2, (showComponents.diffuse ? diff : 0) + 
                                    (showComponents.specular ? spec : 0));
      
      points.push({
        angle: theta,
        intensity,
        spec,
        diff,
        pos: {
          x: outDir.x * (0.3 + intensity * 0.8),
          y: outDir.y * (0.3 + intensity * 0.8),
          z: 0
        }
      });
    }
    
    return points;
  }, [roughness, metallic, f0, L, NdotL, showComponents]);

  // 色変換
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 200, g: 136, b: 102 };
  };

  const rgb = hexToRgb(baseColor);

  // 最終色計算
  const finalColor = useMemo(() => {
    const diffColor = metallic > 0.5 ? { r: 0, g: 0, b: 0 } : rgb;
    const specColor = metallic > 0.5 ? rgb : { r: 255, g: 255, b: 255 };
    
    const r = Math.min(255, diffColor.r * finalDiffuse + specColor.r * finalSpecular);
    const g = Math.min(255, diffColor.g * finalDiffuse + specColor.g * finalSpecular);
    const b = Math.min(255, diffColor.b * finalDiffuse + specColor.b * finalSpecular);
    
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }, [rgb, metallic, finalDiffuse, finalSpecular]);

  // 2Dビューの座標
  const centerX = 200;
  const centerY = 280;
  const vecLen = 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold text-center mb-4 text-cyan-400">
        BRDF（双方向反射率分布関数）の可視化
      </h1>

      <div className="flex flex-wrap gap-4 justify-center">
        {/* 2Dビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">2D断面図</h2>
          <svg width="400" height="350" className="bg-gray-950 rounded">
            {/* サーフェス */}
            <rect x="30" y={centerY} width="340" height="50" fill="#334" />
            <line x1="30" y1={centerY} x2="370" y2={centerY} stroke="#666" strokeWidth="2" />
            
            {/* 反射強度に応じたサーフェスカラー */}
            <rect 
              x="150" y={centerY - 4} 
              width="100" height="8" 
              fill={finalColor}
              rx="2"
            />
            
            {/* BRDFローブ */}
            <defs>
              <linearGradient id="lobeGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ff6644" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffcc44" stopOpacity="0.3" />
              </linearGradient>
            </defs>
            
            {/* ローブの塗りつぶし */}
            <path
              d={generateLobe.map((p, i) => {
                const x = centerX + p.pos.x * vecLen;
                const y = centerY - p.pos.y * vecLen;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ') + ' Z'}
              fill="url(#lobeGradient)"
              stroke="#ff8844"
              strokeWidth="2"
            />
            
            {/* ディフューズローブ（半円） */}
            {showComponents.diffuse && (
              <ellipse
                cx={centerX}
                cy={centerY}
                rx={60 * (1 - metallic)}
                ry={60 * (1 - metallic)}
                fill="rgba(100, 150, 255, 0.2)"
                stroke="#6699ff"
                strokeWidth="1"
                strokeDasharray="4,4"
                clipPath="url(#upperHalf)"
              />
            )}
            <defs>
              <clipPath id="upperHalf">
                <rect x="0" y="0" width="400" height={centerY} />
              </clipPath>
            </defs>
            
            {/* 法線 N */}
            <line x1={centerX} y1={centerY} x2={centerX} y2={centerY - vecLen} 
                  stroke="#44ff44" strokeWidth="2" />
            <polygon points={`${centerX},${centerY - vecLen - 10} ${centerX - 5},${centerY - vecLen} ${centerX + 5},${centerY - vecLen}`} 
                     fill="#44ff44" />
            <text x={centerX + 10} y={centerY - vecLen} fill="#44ff44" fontSize="14" fontWeight="bold">N</text>
            
            {/* 光源方向 L */}
            <line 
              x1={centerX} y1={centerY} 
              x2={centerX + L.x * vecLen} y2={centerY - L.y * vecLen}
              stroke="#ffff44" strokeWidth="3"
            />
            <circle 
              cx={centerX + L.x * (vecLen + 20)} 
              cy={centerY - L.y * (vecLen + 20)} 
              r="12" fill="#ffff00" 
            />
            <text x={centerX + L.x * vecLen + 15} y={centerY - L.y * vecLen - 15} 
                  fill="#ffff44" fontSize="14" fontWeight="bold">L</text>
            
            {/* 視線方向 V */}
            <line 
              x1={centerX} y1={centerY} 
              x2={centerX + V.x * vecLen} y2={centerY - V.y * vecLen}
              stroke="#44ffff" strokeWidth="3"
            />
            <text x={centerX + V.x * vecLen - 20} y={centerY - V.y * vecLen - 15} 
                  fill="#44ffff" fontSize="14" fontWeight="bold">V</text>
            <circle cx={centerX + V.x * (vecLen + 15)} cy={centerY - V.y * (vecLen + 15)} 
                    r="8" fill="#44ffff" opacity="0.8" />
            
            {/* ハーフベクトル H */}
            <line 
              x1={centerX} y1={centerY} 
              x2={centerX + H.x * 70} y2={centerY - H.y * 70}
              stroke="#ff44ff" strokeWidth="2" strokeDasharray="5,3"
            />
            <text x={centerX + H.x * 75} y={centerY - H.y * 75 - 5} 
                  fill="#ff44ff" fontSize="12">H</text>
            
            {/* 反射方向 R */}
            {(() => {
              const RdotN = 2 * NdotL;
              const R = { x: RdotN * N.x - L.x, y: RdotN * N.y - L.y };
              return (
                <line 
                  x1={centerX} y1={centerY} 
                  x2={centerX + R.x * 80} y2={centerY - R.y * 80}
                  stroke="#888" strokeWidth="1" strokeDasharray="3,3"
                />
              );
            })()}
            
            {/* 凡例 */}
            <g transform="translate(20, 20)">
              <rect x="0" y="0" width="90" height="90" fill="#222" rx="5" opacity="0.9" />
              <line x1="10" y1="15" x2="30" y2="15" stroke="#ffff44" strokeWidth="2" />
              <text x="35" y="19" fill="#fff" fontSize="10">L (光源)</text>
              <line x1="10" y1="35" x2="30" y2="35" stroke="#44ffff" strokeWidth="2" />
              <text x="35" y="39" fill="#fff" fontSize="10">V (視線)</text>
              <line x1="10" y1="55" x2="30" y2="55" stroke="#ff44ff" strokeWidth="2" strokeDasharray="3,2" />
              <text x="35" y="59" fill="#fff" fontSize="10">H (half)</text>
              <line x1="10" y1="75" x2="30" y2="75" stroke="#44ff44" strokeWidth="2" />
              <text x="35" y="79" fill="#fff" fontSize="10">N (法線)</text>
            </g>
          </svg>
          
          {/* 角度コントロール */}
          <div className="mt-3 space-y-2">
            <div>
              <label className="text-sm text-yellow-400">
                光源角度: {lightAngle}°
              </label>
              <input type="range" min="5" max="85" value={lightAngle}
                     onChange={(e) => setLightAngle(Number(e.target.value))}
                     className="w-full accent-yellow-400" />
            </div>
            <div>
              <label className="text-sm text-cyan-400">
                視線角度: {viewAngle}°
              </label>
              <input type="range" min="5" max="85" value={viewAngle}
                     onChange={(e) => setViewAngle(Number(e.target.value))}
                     className="w-full accent-cyan-400" />
            </div>
          </div>
        </div>

        {/* 3Dローブビュー */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2 text-cyan-300">3D BRDFローブ</h2>
          <svg
            width="400"
            height="400"
            className="bg-gray-950 rounded cursor-move"
            onMouseDown={(e) => setIsDragging({ x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => {
              if (isDragging) {
                const dx = e.clientX - isDragging.x;
                const dy = e.clientY - isDragging.y;
                setLobeRotation(prev => ({
                  x: Math.max(-60, Math.min(60, prev.x + dy * 0.5)),
                  y: prev.y + dx * 0.5
                }));
                setIsDragging({ x: e.clientX, y: e.clientY });
              }
            }}
            onMouseUp={() => setIsDragging(null)}
            onMouseLeave={() => setIsDragging(null)}
          >
            {/* サーフェス */}
            {(() => {
              const corners = [
                { x: -1.5, y: 0, z: -1.5 },
                { x: 1.5, y: 0, z: -1.5 },
                { x: 1.5, y: 0, z: 1.5 },
                { x: -1.5, y: 0, z: 1.5 }
              ].map(p => project3D(p));
              return (
                <polygon
                  points={corners.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="#334455"
                  stroke="#556677"
                  strokeWidth="1"
                />
              );
            })()}
            
            {/* グリッド */}
            {[-1, -0.5, 0, 0.5, 1].map(i => {
              const start = project3D({ x: i, y: 0, z: -1.5 });
              const end = project3D({ x: i, y: 0, z: 1.5 });
              return <line key={`gx${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#445566" />;
            })}
            {[-1, -0.5, 0, 0.5, 1].map(i => {
              const start = project3D({ x: -1.5, y: 0, z: i });
              const end = project3D({ x: 1.5, y: 0, z: i });
              return <line key={`gz${i}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="#445566" />;
            })}
            
            {/* 3Dローブ（回転体） */}
            {(() => {
              const patches = [];
              const phiSegments = 24;
              
              for (let j = 0; j < phiSegments; j++) {
                const phi0 = (j / phiSegments) * 2 * Math.PI;
                const phi1 = ((j + 1) / phiSegments) * 2 * Math.PI;
                
                for (let i = 0; i < generateLobe.length - 1; i++) {
                  const p0 = generateLobe[i];
                  const p1 = generateLobe[i + 1];
                  
                  const r0 = 0.3 + p0.intensity * 0.8;
                  const r1 = 0.3 + p1.intensity * 0.8;
                  const theta0 = p0.angle;
                  const theta1 = p1.angle;
                  
                  const getPoint = (theta, phi, r) => ({
                    x: Math.sin(theta) * Math.cos(phi) * r,
                    y: Math.cos(theta) * r,
                    z: Math.sin(theta) * Math.sin(phi) * r
                  });
                  
                  const v00 = project3D(getPoint(theta0, phi0, r0));
                  const v01 = project3D(getPoint(theta0, phi1, r0));
                  const v10 = project3D(getPoint(theta1, phi0, r1));
                  const v11 = project3D(getPoint(theta1, phi1, r1));
                  
                  const avgZ = (v00.z + v01.z + v10.z + v11.z) / 4;
                  const avgIntensity = (p0.intensity + p1.intensity) / 2;
                  
                  patches.push({
                    points: `${v00.x},${v00.y} ${v01.x},${v01.y} ${v11.x},${v11.y} ${v10.x},${v10.y}`,
                    z: avgZ,
                    intensity: avgIntensity
                  });
                }
              }
              
              return patches.sort((a, b) => a.z - b.z).map((patch, i) => {
                const alpha = 0.3 + patch.intensity * 0.4;
                const hue = 30 + patch.intensity * 30;
                return (
                  <polygon
                    key={i}
                    points={patch.points}
                    fill={`hsla(${hue}, 80%, ${40 + patch.intensity * 30}%, ${alpha})`}
                    stroke={`hsla(${hue}, 80%, 60%, 0.3)`}
                    strokeWidth="0.5"
                  />
                );
              });
            })()}
            
            {/* 法線 */}
            {(() => {
              const start = project3D({ x: 0, y: 0, z: 0 });
              const end = project3D({ x: 0, y: 1.2, z: 0 });
              return (
                <g>
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                        stroke="#44ff44" strokeWidth="2" />
                  <text x={end.x + 10} y={end.y} fill="#44ff44" fontSize="12">N</text>
                </g>
              );
            })()}
            
            {/* 入射光方向 */}
            {(() => {
              const start = project3D({ x: 0, y: 0, z: 0 });
              const end = project3D({ x: L.x * 1.5, y: L.y * 1.5, z: 0 });
              return (
                <g>
                  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} 
                        stroke="#ffff44" strokeWidth="2" />
                  <circle cx={end.x} cy={end.y} r="8" fill="#ffff00" />
                  <text x={end.x + 10} y={end.y - 5} fill="#ffff44" fontSize="12">L</text>
                </g>
              );
            })()}
          </svg>
          
          <div className="text-sm text-gray-400 text-center mt-2">
            ドラッグで回転 | ローブ形状 = 反射の分布
          </div>
        </div>

        {/* パラメータパネル */}
        <div className="bg-gray-800 rounded-lg p-4 w-80">
          <h2 className="text-lg font-semibold mb-3 text-cyan-300">BRDFパラメータ</h2>
          
          {/* BRDFモデル選択 */}
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">BRDFモデル</label>
            <div className="flex gap-1">
              {[
                { key: 'ggx', name: 'GGX/Cook-Torrance' },
                { key: 'blinn-phong', name: 'Blinn-Phong' },
                { key: 'lambert', name: 'Lambert' }
              ].map(model => (
                <button
                  key={model.key}
                  onClick={() => setBrdfModel(model.key)}
                  className={`flex-1 px-2 py-1 text-xs rounded ${
                    brdfModel === model.key ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>

          {/* マテリアルパラメータ */}
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 flex justify-between">
                <span>Roughness (粗さ)</span>
                <span className="text-cyan-400">{roughness.toFixed(2)}</span>
              </label>
              <input type="range" min="0.05" max="1" step="0.01" value={roughness}
                     onChange={(e) => setRoughness(Number(e.target.value))}
                     className="w-full accent-cyan-400" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>滑らか</span><span>ザラザラ</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-400 flex justify-between">
                <span>Metallic (金属度)</span>
                <span className="text-cyan-400">{metallic.toFixed(2)}</span>
              </label>
              <input type="range" min="0" max="1" step="0.01" value={metallic}
                     onChange={(e) => setMetallic(Number(e.target.value))}
                     className="w-full accent-cyan-400" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>誘電体</span><span>金属</span>
              </div>
            </div>
            
            {metallic < 0.5 && (
              <div>
                <label className="text-sm text-gray-400 flex justify-between">
                  <span>F₀ (基本反射率)</span>
                  <span className="text-cyan-400">{f0.toFixed(3)}</span>
                </label>
                <input type="range" min="0.01" max="0.2" step="0.01" value={f0}
                       onChange={(e) => setF0(Number(e.target.value))}
                       className="w-full accent-cyan-400" />
              </div>
            )}
            
            <div>
              <label className="text-sm text-gray-400">ベースカラー</label>
              <input type="color" value={baseColor}
                     onChange={(e) => setBaseColor(e.target.value)}
                     className="w-full h-8 rounded cursor-pointer" />
            </div>
          </div>

          {/* コンポーネント表示切替 */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowComponents(prev => ({ ...prev, diffuse: !prev.diffuse }))}
              className={`flex-1 px-2 py-1 text-sm rounded ${
                showComponents.diffuse ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              Diffuse
            </button>
            <button
              onClick={() => setShowComponents(prev => ({ ...prev, specular: !prev.specular }))}
              className={`flex-1 px-2 py-1 text-sm rounded ${
                showComponents.specular ? 'bg-orange-600' : 'bg-gray-700'
              }`}
            >
              Specular
            </button>
          </div>

          {/* 計算結果 */}
          <div className="mt-4 bg-gray-900 p-3 rounded">
            <div className="text-cyan-300 font-semibold mb-2">計算値</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">N·L:</div>
              <div className="font-mono">{NdotL.toFixed(4)}</div>
              <div className="text-gray-400">N·V:</div>
              <div className="font-mono">{NdotV.toFixed(4)}</div>
              <div className="text-gray-400">N·H:</div>
              <div className="font-mono">{NdotH.toFixed(4)}</div>
              <div className="text-gray-400">V·H:</div>
              <div className="font-mono">{VdotH.toFixed(4)}</div>
            </div>
            
            {brdfModel === 'ggx' && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-orange-400 text-sm mb-1">Cook-Torrance項</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">D (NDF):</div>
                  <div className="font-mono">{D_GGX.toFixed(4)}</div>
                  <div className="text-gray-400">G (幾何):</div>
                  <div className="font-mono">{G_Smith.toFixed(4)}</div>
                  <div className="text-gray-400">F (フレネル):</div>
                  <div className="font-mono">{F_Schlick.toFixed(4)}</div>
                </div>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-blue-400">Diffuse:</span>
                <span className="font-mono">{finalDiffuse.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-400">Specular:</span>
                <span className="font-mono">{finalSpecular.toFixed(4)}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600">
                <span className="text-cyan-400 font-bold">Total BRDF:</span>
                <span className="font-mono text-lg">{finalBRDF.toFixed(4)}</span>
              </div>
            </div>
            
            {/* 最終色表示 */}
            <div className="mt-3 flex items-center gap-2">
              <div className="text-gray-400 text-sm">最終色:</div>
              <div 
                className="w-16 h-8 rounded border border-gray-600"
                style={{ backgroundColor: finalColor }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 数式パネル */}
      <div className="mt-6 max-w-5xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-cyan-300 mb-3">Cook-Torrance BRDF 数式</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-cyan-400 font-semibold mb-2">全体構造</div>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded">
                f = k_d × f_lambert + k_s × f_cook-torrance
              </div>
              <div className="text-xs text-gray-400 mt-2">
                k_d = (1 - metallic)(1 - F)<br />
                k_s = 1 (エネルギー保存はFで処理)
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-blue-400 font-semibold mb-2">Lambert Diffuse</div>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded">
                f_lambert = baseColor / π
              </div>
              <div className="text-xs text-gray-400 mt-2">
                完全拡散反射。全方向に均一に散乱。
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-orange-400 font-semibold mb-2">Cook-Torrance Specular</div>
              <div className="font-mono text-sm bg-gray-800 p-2 rounded">
                f_spec = (D × G × F) / (4 × N·V × N·L)
              </div>
              <div className="text-xs text-gray-400 mt-2">
                マイクロファセット理論に基づく鏡面反射。
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-purple-400 font-semibold mb-2">D: GGX/Trowbridge-Reitz NDF</div>
              <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                D = α² / (π × ((N·H)² × (α² - 1) + 1)²)
              </div>
              <div className="text-xs text-gray-400 mt-2">
                α = roughness². マイクロファセットの向きの分布。
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-green-400 font-semibold mb-2">G: Smith-Schlick 幾何減衰</div>
              <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                G = G₁(N·V) × G₁(N·L)<br />
                G₁(x) = x / (x × (1 - k) + k)<br />
                k = (roughness + 1)² / 8
              </div>
              <div className="text-xs text-gray-400 mt-2">
                マイクロファセット同士の遮蔽・シャドウイング。
              </div>
            </div>
            
            <div className="bg-gray-900 p-3 rounded">
              <div className="text-red-400 font-semibold mb-2">F: Schlick フレネル</div>
              <div className="font-mono text-xs bg-gray-800 p-2 rounded">
                F = F₀ + (1 - F₀) × (1 - V·H)⁵
              </div>
              <div className="text-xs text-gray-400 mt-2">
                視線角度による反射率の変化。grazing angleで増加。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 解説 */}
      <div className="mt-6 max-w-5xl mx-auto bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-cyan-300 mb-3">BRDFとは</h2>
        <div className="text-sm text-gray-300 space-y-3">
          <p>
            <span className="text-cyan-400 font-bold">BRDF (Bidirectional Reflectance Distribution Function)</span> は、
            入射光がサーフェス上の点でどの方向にどれだけ反射するかを記述する関数です。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">💡→📦→👁️</div>
              <div className="text-cyan-400 font-semibold">入力</div>
              <div className="text-xs">光源方向 L、視線方向 V、法線 N、マテリアルパラメータ</div>
            </div>
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <div className="text-cyan-400 font-semibold">処理</div>
              <div className="text-xs">マイクロファセット分布(D)、幾何減衰(G)、フレネル(F)を計算</div>
            </div>
            <div className="bg-gray-900 p-3 rounded text-center">
              <div className="text-3xl mb-2">🎨</div>
              <div className="text-cyan-400 font-semibold">出力</div>
              <div className="text-xs">その方向への反射光の強度（スカラー値）</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-900 rounded">
            <div className="text-yellow-400 font-semibold mb-2">💡 ローブの見方</div>
            <ul className="text-xs space-y-1">
              <li>• <span className="text-orange-400">ローブの形状</span> = 反射光の空間分布</li>
              <li>• <span className="text-orange-400">roughness小</span> → 細長いローブ（鏡面反射に近い）</li>
              <li>• <span className="text-orange-400">roughness大</span> → 広がったローブ（拡散的）</li>
              <li>• <span className="text-blue-400">青い半円</span> = Lambert拡散成分（金属度が高いと消える）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BRDFVisualization;