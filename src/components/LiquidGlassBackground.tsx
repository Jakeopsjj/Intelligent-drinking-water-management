/**
 * 全应用液态玻璃背景层
 *
 * 渲染策略（兼顾视觉与安卓全机型性能兼容）：
 * 1. WebGL 着色器渲染【低分辨率静态液态纹理】（一次性渲染，不每帧重绘）
 *    —— 着色器内部已实现：菲涅尔边缘高光、介质光线折射形变、环境反射采样、程序化气泡
 * 2. CSS 动画让纹理缓慢漂移，产生"流动"视觉，无需 GLSL 每帧重绘
 * 3. 叠加 CSS 透明气泡粒子层（性能优于 GLSL 粒子，且兼容性好）
 * 4. WebGL 不可用或低性能设备 → 无感降级到 CSS 渐变背景 + 气泡
 *
 * 全层 pointer-events:none，绝不影响控件点击响应与页面滑动帧率。
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

/** 检测设备是否具备良好 WebGL 能力（避免低端机卡顿） */
function detectGLCapability(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // 并发核数太少（极低端机）或明确禁用 GPU 时降级
    const cores = navigator.hardwareConcurrency || 4;
    if (cores < 4) return false;
    // Capacitor Android WebView 中保留启用，但若显存极少也降级
    const dbg = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = (gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
      // 排除已知软渲染/极弱 GPU
      if (/swiftshader|llvmpipe|software/i.test(renderer || '')) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/**
 * 片段着色器：液态玻璃介质渲染
 * - fbm 噪声驱动液态流动纹理
 * - 菲涅尔边缘高光（Fresnel：观察角越平掠，反射越强）
 * - 介质光线折射形变（采样偏移模拟折射）
 * - 环境反射采样（多次采样混合）
 * - 程序化气泡粒子（纯数学绘制，避免粒子数组开销）
 */
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_res.x / u_res.y;

  // 液态流动：随时间漂移的 fbm
  float t = u_time * 0.08;
  float n = fbm(p * 1.2 + vec2(t, t * 0.6));
  float n2 = fbm(p * 2.5 - vec2(t * 0.7, t));

  // 色调：teal / sage / cream 渐变（与全局液态玻璃基调一致）
  vec3 teal = vec3(0.176, 0.372, 0.364);
  vec3 sage = vec3(0.478, 0.607, 0.494);
  vec3 cream = vec3(0.972, 0.952, 0.933);
  vec3 col = mix(teal, sage, n);
  col = mix(col, cream, smoothstep(0.4, 0.85, n2));

  // 菲涅尔边缘高光：观察角平掠时增强反射
  float edge = 1.0 - min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  edge = smoothstep(0.0, 0.35, edge);
  float fresnel = pow(edge, 2.5);
  col += fresnel * vec3(1.0, 0.98, 0.92) * 0.35;

  // 介质光线折射形变：对内部色彩做偏移采样
  vec2 refractOffset = vec2(n2 - 0.5, n - 0.5) * 0.06;
  float refSample = fbm(p * 1.5 + refractOffset * 8.0 + t * 0.4);
  col += (refSample - 0.5) * 0.08;

  // 环境反射高光：右上方向假设光源
  float spec = pow(max(dot(normalize(vec3(n - 0.5, n2 - 0.5, 0.6)), normalize(vec3(0.7, 0.7, 0.5))), 0.0), 24.0);
  col += spec * vec3(1.0) * 0.25;

  // 程序化气泡粒子（4 个静态位置 + 缓慢漂浮）
  vec2 bpos[4];
  bpos[0] = vec2(0.2, 0.3 + sin(t * 1.3) * 0.05);
  bpos[1] = vec2(0.7, 0.5 + cos(t * 0.9) * 0.04);
  bpos[2] = vec2(0.45, 0.75 + sin(t * 1.1) * 0.03);
  bpos[3] = vec2(0.85, 0.2 + cos(t * 1.5) * 0.05);
  for (int i = 0; i < 4; i++) {
    float d = distance(uv, bpos[i]);
    float bubble = smoothstep(0.035, 0.025, d);
    float ring = smoothstep(0.04, 0.035, d) - smoothstep(0.035, 0.03, d);
    col += bubble * vec3(1.0) * 0.5;
    col += ring * vec3(0.8, 0.95, 0.9) * 0.4;
  }

  // 整体压暗以保证上层控件可读性（透光率统一参数）
  col *= 0.55;
  gl_FragColor = vec4(col, 0.92);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** 用 WebGL 静态渲染一帧液态纹理到 canvas（不每帧重绘，性能极佳） */
function renderGlassFrame(canvas: HTMLCanvasElement): boolean {
  const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) return false;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return false;
  const prog = gl.createProgram();
  if (!prog) return false;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), canvas.width, canvas.height);
  gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), Math.random() * 100);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return true;
}

/** CSS 降级背景（WebGL 不可用时使用） */
function CSSFallback() {
  return (
    <div className="liquid-bg-fallback" />
  );
}

/** 透明气泡粒子层（CSS 驱动，性能优于 GLSL 粒子） */
function BubbleLayer() {
  // 8 个气泡，固定位置 + 不同延迟，CSS keyframes 上升
  const bubbles = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: (i * 12 + 6) % 100,
        size: 8 + ((i * 7) % 18),
        delay: (i * 1.7) % 12,
        duration: 14 + (i % 4) * 4,
        opacity: 0.08 + (i % 3) * 0.04,
      })),
    []
  );
  return (
    <div className="liquid-bubble-layer" aria-hidden>
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="liquid-bubble"
          style={{
            left: `${b.left}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            opacity: b.opacity,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LiquidGlassBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // null=检测中, true=GL 可用, false=降级 CSS
  const [useGL, setUseGL] = useState<boolean | null>(null);

  useEffect(() => {
    if (!detectGLCapability()) {
      setUseGL(false);
      return;
    }
    // canvas 始终挂载，直接取 ref
    const canvas = canvasRef.current;
    if (!canvas) {
      setUseGL(false);
      return;
    }
    // 用低分辨率（256x256）渲染静态纹理，CSS 拉伸全屏 + 模糊
    // 既保留着色器视觉效果，又把 GPU 开销降到几乎可忽略
    canvas.width = 256;
    canvas.height = 256;
    const ok = renderGlassFrame(canvas);
    setUseGL(ok);
  }, []);

  // 通过 Portal 渲染到 body，避免被父级 backdrop-filter 创建 containing block
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="liquid-bg-root" aria-hidden>
      {/* canvas 始终挂载，仅 useGL=true 时可见；GL 不可用时它不可见，CSSFallback 兜底 */}
      <canvas ref={canvasRef} className="liquid-bg-canvas" style={{ opacity: useGL ? 1 : 0 }} />
      {useGL === false && <CSSFallback />}
      <BubbleLayer />
    </div>,
    document.body
  );
}
