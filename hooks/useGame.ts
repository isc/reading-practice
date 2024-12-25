export interface GameState {
  isTimedMode: boolean;
  // ... autres propriétés existantes
}

export const useGame = () => {
  // ... code existant

  const toggleTimedMode = () => {
    setState((prev) => ({
      ...prev,
      isTimedMode: !prev.isTimedMode
    }));
  };

  return {
    // ... autres retours
    isTimedMode: state.isTimedMode,
    toggleTimedMode,
  };
};