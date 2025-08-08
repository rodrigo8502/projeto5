import React, { useState, useEffect, useRef, useCallback } from 'react';

// Constantes do Jogo
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BEACH_HEIGHT = 100; // Nova constante para a altura da praia
const WATER_HEIGHT = GAME_HEIGHT - BEACH_HEIGHT; // Altura da área de jogo da água
const FISH_SIZE = 40;
const FISH_SPEED = 10;
const GAME_INTERVAL = 30; // ms para o loop do jogo

// Constantes de Dificuldade
const BASE_ENEMY_SPEED_MIN = 3;
const BASE_ENEMY_SPEED_MAX = 7;
const BASE_ENEMY_SPAWN_INTERVAL = 1500; // ms para gerar um novo inimigo

const DIFFICULTY_SCORE_THRESHOLD = 200; // Aumenta a dificuldade a cada X pontos
const SPEED_INCREASE_PER_LEVEL = 0.5; // Quanto a velocidade máxima aumenta por nível
const SPAWN_DECREASE_PER_LEVEL = 100; // Quanto o intervalo de surgimento diminui por nível

// Tipos de Inimigos
const ENEMY_TYPES = [
  { emoji: '🦈', size: 50 }, // Tubarão
  { emoji: '🐙', size: 45 }, // Polvo
  { emoji: '🐡', size: 40 }, // Baiacu
  { emoji: '🦀', size: 60 }, // Caranguejo
  { emoji: '🐍', size: 55 }, // Moreia (novo!)
  { emoji: '👾', size: 40 }  // Água-viva (novo!)
];

// Esquema de cores do fundo da água
const WATER_COLORS = [
  // A cor da água começa com um azul claro e transita para um verde escuro
  { score: 0, start: '#6dd5ed', end: '#2193b0' },
  { score: 200, start: '#55d6b4', end: '#34a887' },
  { score: 400, start: '#41c098', end: '#28846c' },
  { score: 600, start: '#36a884', end: '#1e6652' },
  { score: 800, start: '#2e5a87', end: '#08324f' },
];

// Função para obter a cor do fundo com base na pontuação
const getWaterColor = (score) => {
  let color = WATER_COLORS[0];
  for (let i = 0; i < WATER_COLORS.length; i++) {
    if (score >= WATER_COLORS[i].score) {
      color = WATER_COLORS[i];
    }
  }
  return color;
};

const App = () => {
  // A posição inicial do peixe agora está relativa à altura da água
  const [fishPosition, setFishPosition] = useState({ x: GAME_WIDTH / 2 - FISH_SIZE / 2, y: GAME_HEIGHT - FISH_SIZE - 20 });
  const [enemies, setEnemies] = useState([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const gameAreaRef = useRef(null);

  // Estados para a dificuldade dinâmica e cor do fundo
  const [currentEnemySpawnInterval, setCurrentEnemySpawnInterval] = useState(BASE_ENEMY_SPAWN_INTERVAL);
  const [currentEnemySpeedMax, setCurrentEnemySpeedMax] = useState(BASE_ENEMY_SPEED_MAX);
  const [backgroundColor, setBackgroundColor] = useState(() => getWaterColor(0));

  // Função para gerar um inimigo aleatório
  const createEnemy = useCallback(() => {
    const type = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
    const x = Math.random() * (GAME_WIDTH - type.size);
    // Inimigos agora aparecem a partir da linha da praia
    const y = BEACH_HEIGHT - type.size;
    const speed = Math.random() * (currentEnemySpeedMax - BASE_ENEMY_SPEED_MIN) + BASE_ENEMY_SPEED_MIN;
    return { id: Date.now() + Math.random(), x, y, speed, emoji: type.emoji, size: type.size };
  }, [currentEnemySpeedMax]);

  // Lógica do loop do jogo
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      // Mover inimigos
      setEnemies(prevEnemies =>
        prevEnemies
          .map(enemy => ({ ...enemy, y: enemy.y + enemy.speed }))
          // Remover inimigos que saem da tela por baixo
          .filter(enemy => enemy.y < GAME_HEIGHT + enemy.size)
      );

      // Atualizar pontuação e verificar aumento de dificuldade
      setScore(prevScore => {
        const newScore = prevScore + 1;
        // Verifica se é hora de aumentar a dificuldade
        if (newScore > 0 && newScore % DIFFICULTY_SCORE_THRESHOLD === 0) {
          setCurrentEnemySpeedMax(prevMax => prevMax + SPEED_INCREASE_PER_LEVEL);
          setCurrentEnemySpawnInterval(prevInterval => Math.max(500, prevInterval - SPAWN_DECREASE_PER_LEVEL));
        }
        // Atualiza a cor do fundo da água
        setBackgroundColor(getWaterColor(newScore));
        return newScore;
      });

      // Verificar colisões
      enemies.forEach(enemy => {
        if (
          fishPosition.x < enemy.x + enemy.size &&
          fishPosition.x + FISH_SIZE > enemy.x &&
          fishPosition.y < enemy.y + enemy.size &&
          fishPosition.y + FISH_SIZE > enemy.y
        ) {
          setGameOver(true);
          setGameStarted(false);
        }
      });
    }, GAME_INTERVAL);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, enemies, fishPosition, score]);

  // Geração de inimigos
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const spawnInterval = setInterval(() => {
      setEnemies(prevEnemies => [...prevEnemies, createEnemy()]);
    }, currentEnemySpawnInterval);

    return () => clearInterval(spawnInterval);
  }, [gameStarted, gameOver, createEnemy, currentEnemySpawnInterval]);

  // Lidar com entrada do teclado para movimento do peixe
  const handleKeyDown = useCallback((e) => {
    if (!gameStarted || gameOver) return;

    setFishPosition(prevPos => {
      let newX = prevPos.x;
      let newY = prevPos.y;

      switch (e.key) {
        case 'ArrowLeft':
          newX = Math.max(0, prevPos.x - FISH_SPEED);
          break;
        case 'ArrowRight':
          newX = Math.min(GAME_WIDTH - FISH_SIZE, prevPos.x + FISH_SPEED);
          break;
        case 'ArrowUp':
          // Peixe não pode ir acima da linha da praia
          newY = Math.max(BEACH_HEIGHT, prevPos.y - FISH_SPEED);
          break;
        case 'ArrowDown':
          newY = Math.min(GAME_HEIGHT - FISH_SIZE, prevPos.y + FISH_SPEED);
          break;
        default:
          break;
      }
      return { x: newX, y: newY };
    });
  }, [gameStarted, gameOver]);

  // Lidar com entrada de toque para movimento do peixe
  const handleTouchMove = useCallback((e) => {
    if (!gameStarted || gameOver || !gameAreaRef.current) return;

    const touch = e.touches[0];
    const gameAreaRect = gameAreaRef.current.getBoundingClientRect();

    const touchX = touch.clientX - gameAreaRect.left;
    const touchY = touch.clientY - gameAreaRect.top;

    setFishPosition(prevPos => {
      let newX = touchX - FISH_SIZE / 2;
      let newY = touchY - FISH_SIZE / 2;

      newX = Math.max(0, Math.min(GAME_WIDTH - FISH_SIZE, newX));
      // Peixe não pode ir acima da linha da praia
      newY = Math.max(BEACH_HEIGHT, Math.min(GAME_HEIGHT - FISH_SIZE, newY));

      return { x: newX, y: newY };
    });
  }, [gameStarted, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    if (gameAreaRef.current) {
      gameAreaRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gameAreaRef.current) {
        gameAreaRef.current.removeEventListener('touchmove', handleTouchMove);
      }
    };
  }, [handleKeyDown, handleTouchMove]);

  // Iniciar ou reiniciar o jogo
  const startGame = () => {
    // A posição inicial do peixe agora está relativa à altura da água
    setFishPosition({ x: GAME_WIDTH / 2 - FISH_SIZE / 2, y: GAME_HEIGHT - FISH_SIZE - 20 });
    setEnemies([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    // Resetar a dificuldade e a cor para os valores base
    setCurrentEnemySpawnInterval(BASE_ENEMY_SPAWN_INTERVAL);
    setCurrentEnemySpeedMax(BASE_ENEMY_SPEED_MAX);
    setBackgroundColor(getWaterColor(0));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-200 to-cyan-300 p-4 font-inter">
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 text-center">
        <h1 className="text-4xl font-bold text-blue-800 mb-2">🐠 Jogo do Peixe Fugitivo 🦈</h1>
        <p className="text-xl text-gray-700">Desvie dos inimigos e faça sua pontuação!</p>
      </div>

      <style>
        {`
          @keyframes water-wave {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
          .water-effect {
            background: linear-gradient(45deg, ${backgroundColor.start}, ${backgroundColor.end}, ${backgroundColor.start});
            background-size: 200% 200%;
            animation: water-wave 10s linear infinite;
            transition: background 1s ease; /* Transição suave para a mudança de cor */
          }
        `}
      </style>

      <div
        ref={gameAreaRef}
        className="relative border-4 border-blue-800 rounded-xl overflow-hidden water-effect"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Praia na parte superior */}
        <div
          className="absolute top-0 left-0 w-full bg-gradient-to-b from-yellow-200 to-yellow-300 border-b-4 border-blue-800"
          style={{ height: BEACH_HEIGHT }}
        >
        </div>

        {/* Peixe */}
        <div
          className="absolute"
          style={{
            left: fishPosition.x,
            top: fishPosition.y,
            width: FISH_SIZE,
            height: FISH_SIZE,
            fontSize: FISH_SIZE - 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'scaleX(-1)'
          }}
        >
          🐟
        </div>

        {/* Inimigos */}
        {enemies.map(enemy => (
          <div
            key={enemy.id}
            className="absolute"
            style={{
              left: enemy.x,
              top: enemy.y,
              width: enemy.size,
              height: enemy.size,
              fontSize: enemy.size - 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {enemy.emoji}
          </div>
        ))}

        {/* Tela de Fim de Jogo / Início */}
        {!gameStarted && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white text-center rounded-xl">
            {gameOver ? (
              <>
                <p className="text-5xl font-bold mb-4">Fim de Jogo!</p>
                <p className="text-3xl mb-6">Sua Pontuação: {score}</p>
              </>
            ) : (
              <p className="text-4xl font-bold mb-4">Pronto para Nadar?</p>
            )}
            <button
              onClick={startGame}
              className="bg-green-500 text-white px-8 py-4 rounded-full text-xl font-bold shadow-lg hover:bg-green-600 transition-colors duration-300 transform hover:scale-105"
            >
              {gameOver ? 'Jogar Novamente' : 'Começar Jogo'}
            </button>
            <p className="mt-4 text-lg">Use as setas do teclado ou toque na tela para mover o peixe.</p>
          </div>
        )}
      </div>

      {/* Exibição da Pontuação */}
      {gameStarted && (
        <div className="bg-white rounded-2xl shadow-xl p-4 mt-6 text-center w-full max-w-md">
          <p className="text-3xl font-bold text-blue-700">Pontuação: {score}</p>
        </div>
      )}
    </div>
  );
};

export default App;
