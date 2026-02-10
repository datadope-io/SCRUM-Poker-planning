import { Bot } from 'lucide-react';
import { Card } from './Card.jsx';
import { GamePhase, UserType } from '../types.jsx';

export function PlayerAvatar({ player, vote, phase }) {
  const hasVoted = !!vote;

  return (
    <div className="flex flex-col items-center gap-3 relative group">
      <div className="h-24 md:h-36 flex items-end mb-2">
        {hasVoted ? (
          <div className="animate-flip-in">
             <Card
               value={vote.value}
               revealed={phase === GamePhase.REVEALED}
               disabled={true}
             />
          </div>
        ) : (
          <div className="w-20 h-32 md:w-24 md:h-36 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center opacity-30">
            <span className="text-slate-400 text-xs uppercase tracking-widest">Thinking</span>
          </div>
        )}
      </div>

      <div className={`relative w-14 h-14 rounded-full border-2 ${hasVoted ? 'border-green-500' : 'border-slate-600'} flex items-center justify-center bg-slate-800 overflow-hidden shadow-lg`}>
        <img
          src={player.avatarUrl}
          alt={player.name}
          className="w-full h-full object-cover"
        />
        {player.type === UserType.AI && (
          <div className="absolute bottom-0 right-0 bg-indigo-600 rounded-full p-1 border border-slate-900">
             <Bot size={10} className="text-white" />
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-white">{player.name}</p>
        {player.persona && (
          <p className="text-xs text-slate-400 max-w-[100px] truncate">{player.persona}</p>
        )}
      </div>

      {phase === GamePhase.REVEALED && vote?.reasoning && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 bg-slate-700 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-700"></div>
          <span className="font-semibold text-indigo-300">AI Reasoning:</span>
          <p className="mt-1 leading-tight">{vote.reasoning}</p>
        </div>
      )}
    </div>
  );
}
