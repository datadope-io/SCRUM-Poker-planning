import React from 'react';

interface CardProps {
  value: number | string | null;
  selected?: boolean;
  revealed?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isSmall?: boolean;
}

export const Card: React.FC<CardProps> = ({
  value,
  selected = false,
  revealed = true,
  onClick,
  disabled = false,
  isSmall = false
}) => {
  const baseClasses = "relative flex items-center justify-center font-bold rounded-lg shadow-lg cursor-pointer transition-all duration-200 border-2 select-none";
  const sizeClasses = isSmall
    ? "w-10 h-14 text-lg border-2"
    : "w-20 h-32 md:w-24 md:h-36 text-3xl md:text-4xl";

  const stateClasses = selected
    ? "bg-indigo-600 border-indigo-400 text-white -translate-y-4 shadow-indigo-500/50"
    : "bg-white text-slate-900 border-slate-200 hover:-translate-y-2 hover:shadow-xl hover:border-indigo-300";

  const hiddenClasses = "bg-indigo-900 border-indigo-700 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]";

  // If not revealed and has a value (meaning someone voted but we can't see it), show the back of the card
  // If value is null, it's a placeholder or unselected state in the deck
  const isFaceDown = !revealed && value !== null;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        ${baseClasses}
        ${sizeClasses}
        ${isFaceDown ? hiddenClasses : stateClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed hover:transform-none' : ''}
      `}
    >
      {isFaceDown ? (
        <div className="w-full h-full flex items-center justify-center opacity-20">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
};
