import React, { useEffect, useRef, useState, useCallback } from 'react';

const W = 300;
const H = 400;
const GRAVITY = 0.35;
const JUMP = -6.5;
const PIPE_W = 45;
const PIPE_GAP = 130;
const PIPE_SPEED = 2.2;
const BIRD_SIZE = 22;

function FlappyGame({ onClose }) {
    const canvasRef = useRef(null);
    const animRef = useRef(null);
    const stateRef = useRef({
        bird: { y: H / 2, vy: 0, rotation: 0 },
        pipes: [],
        score: 0,
        gameOver: false,
        started: false,
        frame: 0,
        particles: [],
    });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);

    const spawnPipe = useCallback(() => {
        const gapY = 80 + Math.random() * (H - 160 - PIPE_GAP);
        stateRef.current.pipes.push({
            x: W + 10,
            gapY,
            scored: false,
        });
    }, []);

    const jump = useCallback(() => {
        const s = stateRef.current;
        if (s.gameOver) return;
        if (!s.started) {
            s.started = true;
            setStarted(true);
            spawnPipe();
        }
        s.bird.vy = JUMP;
        // Heart particles
        for (let i = 0; i < 3; i++) {
            s.particles.push({
                x: 50,
                y: s.bird.y,
                vx: -1 - Math.random() * 2,
                vy: -1 + Math.random() * 2,
                life: 30,
                emoji: '💕',
            });
        }
    }, [spawnPipe]);

    const draw = useCallback((ctx) => {
        const s = stateRef.current;

        // Sky gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, '#1e1a16');
        skyGrad.addColorStop(0.5, '#2a2520');
        skyGrad.addColorStop(1, '#3a332c');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, W, H);

        // Stars
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        for (let i = 0; i < 20; i++) {
            const sx = (i * 73 + s.frame * 0.1) % W;
            const sy = (i * 47) % (H * 0.6);
            ctx.beginPath();
            ctx.arc(sx, sy, 1, 0, Math.PI * 2);
            ctx.fill();
        }

        // Pipes (wedding arches)
        s.pipes.forEach(pipe => {
            // Top pipe
            const topH = pipe.gapY;
            const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
            pipeGrad.addColorStop(0, '#6b7c5e');
            pipeGrad.addColorStop(0.5, '#8a9e7a');
            pipeGrad.addColorStop(1, '#6b7c5e');
            ctx.fillStyle = pipeGrad;

            // Top column
            ctx.fillRect(pipe.x, 0, PIPE_W, topH);
            // Top cap (decorative)
            ctx.fillStyle = '#556b4a';
            ctx.fillRect(pipe.x - 4, topH - 15, PIPE_W + 8, 15);
            // Flower decoration on cap
            ctx.font = '14px serif';
            ctx.fillText('🌸', pipe.x + PIPE_W / 2 - 7, topH - 2);

            // Bottom pipe
            const botY = pipe.gapY + PIPE_GAP;
            ctx.fillStyle = pipeGrad;
            // Bottom pipe
            ctx.fillRect(pipe.x, botY, PIPE_W, H - botY);
            // Bottom cap
            ctx.fillStyle = '#556b4a';
            ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 15);
            ctx.font = '14px serif';
            ctx.fillText('🌺', pipe.x + PIPE_W / 2 - 7, botY + 13);
        });

        // Particles
        s.particles.forEach(p => {
            ctx.globalAlpha = p.life / 30;
            ctx.font = '12px serif';
            ctx.fillText(p.emoji, p.x, p.y);
        });
        ctx.globalAlpha = 1;

        // Bird (wedding dove/ring)
        ctx.save();
        ctx.translate(50, s.bird.y);
        ctx.rotate(Math.min(s.bird.rotation * Math.PI / 180, Math.PI / 4));
        ctx.font = `${BIRD_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🕊️', 0, 0);
        ctx.restore();

        // Ground
        const groundGrad = ctx.createLinearGradient(0, H - 30, 0, H);
        groundGrad.addColorStop(0, '#2d5a27');
        groundGrad.addColorStop(1, '#1a3a15');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, H - 30, W, 30);

        // Ground flowers
        ctx.font = '10px serif';
        for (let i = 0; i < W; i += 25) {
            const fx = (i + s.frame * 2) % (W + 25) - 12;
            ctx.fillText('🌷', fx, H - 18);
        }

        // Score
        ctx.fillStyle = '#c4aa7c';
        ctx.font = 'bold 28px "Playfair Display", serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.score, W / 2, 45);
    }, []);

    const gameLoopFn = useCallback(() => {
        const s = stateRef.current;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        s.frame++;

        if (s.started && !s.gameOver) {
            // Bird physics
            s.bird.vy += GRAVITY;
            s.bird.y += s.bird.vy;
            s.bird.rotation = s.bird.vy * 4;

            // Pipe logic
            s.pipes.forEach(pipe => {
                pipe.x -= PIPE_SPEED;
            });

            // Spawn new pipes
            if (s.pipes.length === 0 || s.pipes[s.pipes.length - 1].x < W - 170) {
                spawnPipe();
            }

            // Remove offscreen pipes
            s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

            // Score
            s.pipes.forEach(pipe => {
                if (!pipe.scored && pipe.x + PIPE_W < 50) {
                    pipe.scored = true;
                    s.score++;
                    setScore(s.score);
                }
            });

            // Collision detection
            const bx = 50, by = s.bird.y, br = BIRD_SIZE / 2 - 2;

            // Ground/ceiling
            if (by + br > H - 30 || by - br < 0) {
                s.gameOver = true;
                setGameOver(true);
            }

            // Pipes
            s.pipes.forEach(pipe => {
                if (bx + br > pipe.x && bx - br < pipe.x + PIPE_W) {
                    if (by - br < pipe.gapY || by + br > pipe.gapY + PIPE_GAP) {
                        s.gameOver = true;
                        setGameOver(true);
                    }
                }
            });

            // Particles
            s.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
            });
            s.particles = s.particles.filter(p => p.life > 0);
        }

        draw(ctx);
        animRef.current = requestAnimationFrame(gameLoopFn);
    }, [draw, spawnPipe]);

    useEffect(() => {
        animRef.current = requestAnimationFrame(gameLoopFn);
        return () => cancelAnimationFrame(animRef.current);
    }, [gameLoopFn]);

    useEffect(() => {
        const handleKey = (e) => {
            if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
                e.preventDefault();
                jump();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [jump]);

    const restart = () => {
        const s = stateRef.current;
        s.bird = { y: H / 2, vy: 0, rotation: 0 };
        s.pipes = [];
        s.score = 0;
        s.gameOver = false;
        s.started = false;
        s.frame = 0;
        s.particles = [];
        setScore(0);
        setGameOver(false);
        setStarted(false);
    };

    return (
        <div className="mini-game-wrapper">
            <div className="mini-game-header">
                <h3>🕊️ Paloma Voladora</h3>
                <button className="game-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="mini-game-score">Puntos: {score}</div>
            <div
                className="mini-game-canvas-wrap"
                onClick={jump}
                onTouchStart={(e) => { e.preventDefault(); jump(); }}
            >
                <canvas ref={canvasRef} width={W} height={H} className="mini-game-canvas" />
                {!started && !gameOver && (
                    <div className="game-overlay">
                        <p>🕊️ ¡Ayudá a la paloma!</p>
                        <p className="game-hint">Toca / Espacio / ↑</p>
                    </div>
                )}
                {gameOver && (
                    <div className="game-overlay game-over">
                        <p>💔 Game Over</p>
                        <p className="game-final-score">{score} puntos</p>
                        <button className="game-restart-btn" onClick={(e) => { e.stopPropagation(); restart(); }}>Reintentar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default FlappyGame;
