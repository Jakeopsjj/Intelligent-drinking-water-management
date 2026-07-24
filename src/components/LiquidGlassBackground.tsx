/**
 * 全应用液态玻璃背景层 —— 增强版
 *
 * 视觉升级：
 * 1. 动态色彩渐变（teal/sage/lavender/cream 四色融合）
 * 2. 增强菲涅尔边缘高光（更明显的折射光泽）
 * 3. 多层介质折射形变（模拟光线穿过不同密度液体）
 * 4. 程序化气泡粒子（8个，大小随机，含环状折射光晕）
 * 5. 微弱的焦散（caustics）模拟
 * 6. CSS 叠加层：流动光斑 + 透明气泡 + 径向渐变暗角
 *
 * 性能策略：
 * - WebGL 静态渲染一帧（256x256），CSS 拉伸 + 模糊 + 缓慢漂移
 * - 低端设备自动降级为 CSS 渐变
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

function detectGLCapability(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    const cores = navigator.hardwareConcurrency || 4;
    if (cores < 4) return false;
    const dbg = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      const renderer = (gl as WebGLRenderingContext).getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string;
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
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.48; }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_res.x / u_res.y;

  float t = u_time * 0.06;

  // 多层液态流动噪声
  float n1 = fbm(p * 1.3 + vec2(t, t * 0.55));
  float n2 = fbm(p * 2.6 - vec2(t * 0.7, t * 0.3));
  float n3 = fbm(p * 4.2 + vec2(t * 0.4, -t * 0.65));

  // 四色渐变（teal / sage / lavender / cream）
  vec3 teal    = vec3(0.176, 0.372, 0.364);
  vec3 sage    = vec3(0.478, 0.607, 0.494);
  vec3 lavender = vec3(0.75, 0.72, 0.82);
  vec3 cream   = vec3(0.972, 0.952, 0.933);

  vec3 col = mix(teal, sage, n1);
  col = mix(col, lavender, smoothstep(0.35, 0.7, n2));
  col = mix(col, cream, smoothstep(0.45, 0.88, n3));

  // 增强菲涅尔边缘高光
  float edge = 1.0 - min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  edge = smoothstep(0.0, 0.4, edge);
  float fresnel = pow(edge, 2.2);
  col += fresnel * vec3(1.0, 0.97, 0.9) * 0.42;

  // 介质折射形变（多层采样偏移）
  vec2 refract1 = vec2(n2 - 0.5, n1 - 0.5) * 0.07;
  vec2 refract2 = vec2(n3 - 0.5, n2 - 0.5) * 0.04;
  float refSample1 = fbm(p * 1.6 + refract1 * 8.0 + t * 0.35);
  float refSample2 = fbm(p * 2.8 + refract2 * 6.0 - t * 0.25);
  col += (refSample1 - 0.5) * 0.06;
  col += (refSample2 - 0.5) * 0.04;

  // 环境反射高光（双光源）
  vec3 normal = normalize(vec3(n1 - 0.5, n2 - 0.5, 0.55));
  float spec1 = pow(max(dot(normal, normalize(vec3(0.7, 0.7, 0.5))), 0.0), 20.0);
  float spec2 = pow(max(dot(normal, normalize(vec3(-0.5, 0.3, 0.7))), 0.0), 28.0);
  col += spec1 * vec3(1.0, 0.98, 0.92) * 0.3;
  col += spec2 * vec3(0.85, 0.92, 1.0) * 0.15;

  // 焦散模拟（微弱波纹光斑）
  float caustic = fbm(uv * 18.0 + vec2(t * 0.8, -t * 0.5));
  caustic = smoothstep(0.55, 0.7, caustic);
  col += caustic * vec3(1.0, 0.96, 0.88) * 0.08;

  // 程序化气泡粒子（8个，大小随机，带环状折射光晕）
  vec2 bpos[8];
  float bsize[8];
  bpos[0] = vec2(0.15, 0.25 + sin(t * 1.4) * 0.06);  bsize[0] = 0.03;
  bpos[1] = vec2(0.72, 0.48 + cos(t * 0.8) * 0.05);  bsize[1] = 0.04;
  bpos[2] = vec2(0.42, 0.78 + sin(t * 1.1) * 0.04);  bsize[2] = 0.025;
  bpos[3] = vec2(0.88, 0.18 + cos(t * 1.6) * 0.06);  bsize[3] = 0.035;
  bpos[4] = vec2(0.28, 0.62 + sin(t * 0.9) * 0.05);  bsize[4] = 0.028;
  bpos[5] = vec2(0.58, 0.15 + cos(t * 1.3) * 0.05);  bsize[5] = 0.032;
  bpos[6] = vec2(0.08, 0.85 + sin(t * 1.0) * 0.04);  bsize[6] = 0.022;
  bpos[7] = vec2(0.65, 0.92 + cos(t * 0.7) * 0.03);  bsize[7] = 0.026;

  for (int i = 0; i < 8; i++) {
    float d = distance(uv, bpos[i]);
    float inner = smoothstep(bsize[i], bsize[i] * 0.7, d);
    float ring = smoothstep(bsize[i] * 1.4, bsize[i] * 1.05, d) - smoothstep(bsize[i] * 1.05, bsize[i] * 0.8, d);
    col += inner * vec3(1.0, 0.98, 0.94) * 0.55;
    col += ring * vec3(0.75, 0.92, 0.88) * 0.45;
  }

  // 整体透光率（基底暗度，确保上层控件可读性）
  col *= 0.52;
  gl_FragColor = vec4(col, 0.9);
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

function CSSFallback() {
  return (
    <div className="liquid-bg-fallback" />
  );
}

function BubbleLayer() {
  const bubbles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        left: (i * 8 + 7) % 100,
        size: 6 + ((i * 5) % 22),
        delay: (i * 1.3) % 14,
        duration: 12 + (i % 5) * 3,
        opacity: 0.06 + (i % 4) * 0.03,
        driftX: ((i % 3) - 1) * 15,
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
            '--drift-x': `${b.driftX}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export default function LiquidGlassBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useGL, setUseGL] = useState<boolean | null>(null);

  useEffect(() => {
    if (!detectGLCapability()) {
      setUseGL(false);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setUseGL(false);
      return;
    }
    canvas.width = 256;
    canvas.height = 256;
    const ok = renderGlassFrame(canvas);
    setUseGL(ok);
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="liquid-bg-root" aria-hidden>
      <canvas ref={canvasRef} className="liquid-bg-canvas" style={{ opacity: useGL ? 1 : 0 }} />
      {useGL === false && <CSSFallback />}
      <BubbleLayer />
    </div>,
    document.body
  );
}