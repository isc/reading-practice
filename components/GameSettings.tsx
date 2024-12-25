import { TimedMode } from './TimedMode';

export const GameSettings: React.FC = () => {
  const { difficulty, isTimedMode, toggleTimedMode } = useGame();

  return (
    <div className="space-y-4">
      {/* ... autres contrôles existants */}
      <div className="flex items-center space-x-2">
        <label htmlFor="timed-mode" className="text-sm font-medium text-gray-700">
          Mode contre la montre
        </label>
        <input
          type="checkbox"
          id="timed-mode"
          checked={isTimedMode}
          onChange={toggleTimedMode}
          className="h-4 w-4 text-blue-600 rounded border-gray-300"
        />
      </div>
      <TimedMode isActive={isTimedMode} difficulty={difficulty} />
    </div>
  );
};