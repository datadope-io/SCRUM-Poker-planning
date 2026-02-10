import { useState } from 'react';
import { GamePhase } from '../types.jsx';
import { RefreshCw, Play, FileText, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

export function StoryPanel({
  story,
  phase,
  onUpdateStory,
  onStartVoting,
  onReset,
  onRevote,
  canEdit
}) {
  const [showDetails, setShowDetails] = useState(false);

  const isVoting = phase === GamePhase.VOTING;
  const isRevealed = phase === GamePhase.REVEALED;
  const hasContent = story.title.trim().length > 0 || story.description.trim().length > 0;

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 w-full max-w-2xl mx-auto mb-8 transition-all">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">

         <div className="flex-1 text-center md:text-left">
             {hasContent ? (
                 <div>
                    <h2 className="text-xl font-bold text-white">{story.title || "Untitled Topic"}</h2>
                    {story.description && <p className="text-slate-400 text-sm mt-1 line-clamp-2">{story.description}</p>}
                 </div>
             ) : (
                 <div className="text-slate-400 italic flex items-center justify-center md:justify-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {phase === GamePhase.SETUP ? "Ready to vote" : "Voting in progress (Quick Vote)"}
                 </div>
             )}
         </div>

         <div className="flex items-center gap-3">
             {phase === GamePhase.SETUP && (
                <>
                   <button
                     onClick={() => setShowDetails(!showDetails)}
                     className="p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded hover:bg-slate-700"
                     title="Add Topic Details (Optional)"
                   >
                      {showDetails ? <ChevronUp size={20} /> : <FileText size={20} />}
                   </button>
                   <button
                     onClick={onStartVoting}
                     className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all"
                   >
                     <Play size={18} fill="currentColor" />
                     Start
                   </button>
                </>
             )}

             {(isVoting || isRevealed) && (
                  <div className="flex items-center gap-2 md:gap-4">
                     {isVoting && (
                          <span className="flex items-center gap-2 text-indigo-400 text-sm font-medium animate-pulse mr-2">
                             <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                             Voting...
                          </span>
                     )}
                     {isRevealed && (
                       <>
                         <button
                             onClick={onRevote}
                             className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-600 text-sm"
                             title="Clear votes and vote again on this topic"
                         >
                             <RotateCcw size={16} />
                             Re-vote
                         </button>
                         <button
                             onClick={onReset}
                             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg"
                         >
                             <RefreshCw size={18} />
                             Next Round
                         </button>
                       </>
                     )}
                  </div>
             )}
         </div>
      </div>

      {phase === GamePhase.SETUP && showDetails && (
        <div className="mt-6 pt-6 border-t border-slate-700 animate-flip-in">
          <div className="space-y-4">
            <div>
               <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Topic / Story (Optional)</label>
               <input
                 type="text"
                 value={story.title}
                 onChange={(e) => onUpdateStory({ ...story, title: e.target.value })}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-600"
                 placeholder="e.g. Ticket #123"
               />
            </div>
            <div>
               <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">Context for AI (Optional)</label>
               <textarea
                 value={story.description}
                 onChange={(e) => onUpdateStory({ ...story, description: e.target.value })}
                 className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white h-20 focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder-slate-600"
                 placeholder="Add details if you want AI to vote accurately..."
               />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
