import { useEffect, useRef } from 'react';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.floor(canvas.width / 18);
    const drops: number[] = Array(cols).fill(0).map(() => Math.random() * -50);

    // Mix of binary, hex chars and crypto terms
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF'.split('');

    let frame = 0;
    const draw = () => {
      frame++;
      // Semi-transparent black to create trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * 18;

        // Leading char is bright green
        if (Math.random() > 0.95) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00ff41';
          ctx.shadowBlur = 8;
        } else {
          const alpha = Math.random() * 0.5 + 0.3;
          ctx.fillStyle = `rgba(0, 255, 65, ${alpha})`;
          ctx.shadowBlur = 0;
        }

        ctx.font = `${Math.random() > 0.9 ? 'bold ' : ''}13px JetBrains Mono, monospace`;
        ctx.fillText(char, i * 18, y);

        // Reset drop randomly
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 0.5 + Math.random() * 0.5;
      }
    };

    const interval = setInterval(draw, 40);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="matrix-canvas"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.15,
      }}
    />
  );
}
