import React, { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';

interface TimedModeProps {
  isActive: boolean;
  difficulty: number;
}

export const TimedMode: React.FC<TimedModeProps> = ({ isActive, difficulty }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimeUp, setIsTimeUp] = useState<boolean>(false);
  const { resetGame } = useGame();

  // Calculer le temps en fonction de la difficulté
  const calculateTime = (difficulty: number): number => {
    // Base de 10 secondes + 2 secondes par niveau de difficulté
    return 10 + (difficulty * 2);
  };

  useEffect(() => {
    if (isActive) {
      setTimeLeft(calculateTime(difficulty));
      setIsTimeUp(false);
    }
  }, [isActive, difficulty]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimeUp(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isActive, timeLeft]);

  const handleTimeUp = () => {
    resetGame();
    setIsTimeUp(false);
    setTimeLeft(calculateTime(difficulty));
  };

  if (!isActive) return null;

  return (
    <div className="fixed top-4 right-4 p-4 bg-white rounded-lg shadow-md">
      {isTimeUp ? (
        <div className="text-center">
          <p className="text-red-600 font-bold mb-2">Temps écoulé !</p>
          <button
            onClick={handleTimeUp}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-gray-800'}`}>
            {timeLeft}s
          </p>
        </div>
      )}
    </div>
  );
};