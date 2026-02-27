import React, { useEffect, useRef, useState, useCallback } from 'react';

const CELL = 20;
const COLS = 15;
const ROWS = 15;
const W = COLS * CELL;
const H = ROWS * CELL;

const WEDDING_ITEMS = ['💍', '💐', '🥂', '🎂', '💒', '👰', '🤵', '💝'];

function SnakeGame({ onClose }) {
    const canvasRef = useRef(null);
    const gameLoop = useRef(null);
    const stateRef = useRef({
        snake: [{ x: 7, y: 7 }],
        dir: { x: 1, y: 0 },
        nextDir: { x: 1, y: 0 },
        food: { x: 10, y: 7 },
        foodEmoji: '💍',
        score: 0,
        gameOver: false,
        started: false,
        speed: 150,
    });
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [started, setStarted] = useState(false);

    const spawnFood = useCallback(() => {
        const s = stateRef.current;
        let pos;
        do {
            pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
        } while (s.snake.some(seg => seg.x === pos.x && seg.y === pos.y));
        s.food = pos;
        s.foodEmoji = WEDDING_ITEMS[Math.floor(Math.random() * WEDDING_ITEMS.length)];
    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const s = stateRef.current;

        // Background
        ctx.fillStyle = '#2a2520';
        ctx.fillRect(0, 0, W, H);

        // Grid pattern
        ctx.strokeStyle = 'rgba(196, 170, 124, 0.08)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL, 0);
            ctx.lineTo(i * CELL, H);
            ctx.stroke();
        }
        for (let i = 0; i <= ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * CELL);
            ctx.lineTo(W, i * CELL);
            ctx.stroke();
        }

        // Snake
        s.snake.forEach((seg, i) => {
            const ratio = 1 - i / s.snake.length;
            const r = Math.round(107 * ratio + 66 * (1 - ratio));
            const g = Math.round(124 * ratio + 80 * (1 - ratio));
            const b = Math.round(94 * ratio + 60 * (1 - ratio));
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const pad = i === 0 ? 1 : 2;
            ctx.beginPath();
            ctx.roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 4);
            ctx.fill();

            // Eyes on head
            if (i === 0) {
                ctx.fillStyle = '#fff';
                const ex = seg.x * CELL + CELL / 2 + s.dir.x * 3;
                const ey = seg.y * CELL + CELL / 2 + s.dir.y * 3;
                ctx.beginPath();
                ctx.arc(ex - 2, ey - 2, 2, 0, Math.PI * 2);
                ctx.arc(ex + 2, ey + 2, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Food emoji
        ctx.font = `${CELL - 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(s.foodEmoji, s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2);
    }, []);

    const tick = useCallback(() => {
        const s = stateRef.current;
        if (s.gameOver || !s.started) return;

        s.dir = s.nextDir;
        const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };

        // Walls
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
            s.gameOver = true;
            setGameOver(true);
            return;
        }

        // Self collision
        if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
            s.gameOver = true;
            setGameOver(true);
            return;
        }

        s.snake.unshift(head);

        if (head.x === s.food.x && head.y === s.food.y) {
            s.score += 10;
            setScore(s.score);
            s.speed = Math.max(80, s.speed - 3);
            spawnFood();
        } else {
            s.snake.pop();
        }

        draw();
    }, [draw, spawnFood]);

    useEffect(() => {
        draw();

        const handleKey = (e) => {
            const s = stateRef.current;
            const key = e.key;

            if (!s.started && !s.gameOver) {
                s.started = true;
                setStarted(true);
            }

            if (s.gameOver) return;

            const dirs = {
                ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
                ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
                w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
                a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
            };

            if (dirs[key]) {
                e.preventDefault();
                const nd = dirs[key];
                if (nd.x !== -s.dir.x || nd.y !== -s.dir.y) {
                    s.nextDir = nd;
                }
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [draw]);

    useEffect(() => {
        if (started && !gameOver) {
            gameLoop.current = setInterval(tick, stateRef.current.speed);
            return () => clearInterval(gameLoop.current);
        }
    }, [started, gameOver, tick]);

    // Restart speed interval when speed changes via score
    useEffect(() => {
        if (started && !gameOver) {
            clearInterval(gameLoop.current);
            gameLoop.current = setInterval(tick, stateRef.current.speed);
            return () => clearInterval(gameLoop.current);
        }
    }, [score, started, gameOver, tick]);

    const restart = () => {
        const s = stateRef.current;
        s.snake = [{ x: 7, y: 7 }];
        s.dir = { x: 1, y: 0 };
        s.nextDir = { x: 1, y: 0 };
        s.score = 0;
        s.gameOver = false;
        s.started = false;
        s.speed = 150;
        setScore(0);
        setGameOver(false);
        setStarted(false);
        spawnFood();
        draw();
    };

    // Touch controls
    const touchStart = useRef(null);
    const handleTouchStart = (e) => {
        touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e) => {
        if (!touchStart.current) return;
        const s = stateRef.current;
        const dx = e.changedTouches[0].clientX - touchStart.current.x;
        const dy = e.changedTouches[0].clientY - touchStart.current.y;

        if (!s.started && !s.gameOver) {
            s.started = true;
            setStarted(true);
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            const nd = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
            if (nd.x !== -s.dir.x) s.nextDir = nd;
        } else {
            const nd = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
            if (nd.y !== -s.dir.y) s.nextDir = nd;
        }
    };

    return (
        <div className="mini-game-wrapper">
            <div className="mini-game-header">
                <h3>🐍 Culebrita Nupcial</h3>
                <button className="game-close-btn" onClick={onClose}>✕</button>
            </div>
            <div className="mini-game-score">Puntos: {score}</div>
            <div className="mini-game-canvas-wrap"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <canvas ref={canvasRef} width={W} height={H} className="mini-game-canvas" />
                {!started && !gameOver && (
                    <div className="game-overlay">
                        <p>🐍 Recolectá items de boda</p>
                        <p className="game-hint">Flechas / WASD / Swipe</p>
                    </div>
                )}
                {gameOver && (
                    <div className="game-overlay game-over">
                        <p>💔 Game Over</p>
                        <p className="game-final-score">{score} puntos</p>
                        <button className="game-restart-btn" onClick={restart}>Reintentar</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SnakeGame;
