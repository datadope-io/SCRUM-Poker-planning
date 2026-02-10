import { useState, useEffect } from 'react';
import { useSupabaseRoom } from './hooks/useSupabaseRoom';
import { UserType, GamePhase, FIBONACCI_DECK } from './types';
import { AI_PERSONAS } from './constants';
import { Card } from './components/Card';
import { PlayerAvatar } from './components/PlayerAvatar';
import { StoryPanel } from './components/StoryPanel';
import { ResultsChart } from './components/ResultsChart';
import { UsernameModal, useUsername } from './components/UsernameModal.tsx';
import { Users, Bot, Wifi, PlayCircle, Plus, Share2, Check } from 'lucide-react';
import { generateId, generateShortId } from './lib/utils';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const { username, saveUsername, isLoaded: isUsernameLoaded } = useUsername();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');

    if (rid) {
      setRoomId(rid);
    } else {
      const newId = generateShortId();
      setRoomId(newId);
      window.history.replaceState(null, '', `?room=${newId}`);
    }
  }, []);

  const {
    currentUser,
    roomState,
    isProcessingAI,
    copied,
    allVoted,
    updateStory,
    updatePhase,
    addAiPlayers,
    handleVote,
    copyInviteLink,
    createNewGame
  } = useSupabaseRoom(roomId, username);

  const restartRound = () => {
    updatePhase(GamePhase.VOTING);
  };

  const resetGame = () => {
    updateStory({ title: '', description: '' });
    updatePhase(GamePhase.VOTING);
  };

  // Don't render the app until username is loaded
  if (!isUsernameLoaded) {
// Check if Supabase is configured
  if (!currentUser || !roomId) {
    return (
      <div className="min-h-screen bg-poker-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-poker-bg flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Show username modal if no username is set
  if (!username) {
    return <UsernameModal onSave={saveUsername} onClose={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-poker-bg text-white pb-20">
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3 w-full md:w-auto">
           <div className="bg-indigo-600 p-2 rounded-lg">
             <Users size={24} className="text-white" />
           </div>
           <div className="flex flex-col">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
                Gemini Planning Poker
              </h1>
              <span className="text-xs text-slate-500 font-mono mt-1">Room: {roomId}</span>
           </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 mr-2">
              <button
                onClick={copyInviteLink}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all border ${
                    copied
                    ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                }`}
                title="Copy Link to Clipboard"
              >
                {copied ? <Check size={16} /> : <Share2 size={16} />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
              </button>

              <button
                onClick={createNewGame}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-all shadow-lg hover:shadow-indigo-500/25 border border-indigo-400"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">New Game</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden md:block mx-1"></div>

            <button
              onClick={addAiPlayers}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-sm transition-all"
              title="Add AI Teammates"
            >
               <Bot size={16} className="text-indigo-400" />
               <span className="hidden lg:inline">Add AI</span>
            </button>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8">
        <StoryPanel
          story={roomState.story}
          phase={roomState.phase}
          players={roomState.players}
          onUpdateStory={updateStory}
          onStartVoting={() => updatePhase(GamePhase.VOTING)}
          onReset={resetGame}
          onRevote={restartRound}
          canEdit={roomState.phase === GamePhase.SETUP}
        />

        {roomState.phase !== GamePhase.SETUP && (
            <>
                <div className="relative min-h-[300px] mb-12 flex justify-center">
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 items-center w-full max-w-5xl">
                        {roomState.players.map(player => (
                            <PlayerAvatar
                                key={player.id}
                                player={player}
                                vote={roomState.votes[player.id]}
                                phase={roomState.phase}
                                isCurrentUser={currentUser?.id === player.id}
                            />
                        ))}
                    </div>

                    {roomState.phase === GamePhase.VOTING && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <button
                                onClick={() => updatePhase(GamePhase.REVEALED)}
                                disabled={!allVoted}
                                className={`
                                    flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all transform
                                    ${allVoted
                                        ? 'bg-indigo-600 hover:bg-indigo-500 hover:scale-110 text-white animate-bounce-subtle'
                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-80'
                                    }
                                `}
                            >
                                <PlayCircle size={24} />
                                {allVoted ? 'Reveal Cards' : 'Waiting...'}
                            </button>
                        </div>
                    )}
                </div>

                {roomState.phase === GamePhase.REVEALED && (
                    <div className="mb-12 animate-flip-in">
                        <ResultsChart votes={roomState.votes} />
                    </div>
                )}
            </>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 p-4 transition-transform duration-300 z-40 shadow-2xl">
            <div className="max-w-4xl mx-auto flex gap-2 sm:gap-4 overflow-x-auto justify-start sm:justify-center pb-2 px-2 snap-x">
                {FIBONACCI_DECK.map(value => (
                    <div key={value} className="snap-center shrink-0">
                        <Card
                            value={value}
                            isSmall={true}
                            selected={roomState.votes[currentUser?.id]?.value === value}
                            onClick={() => handleVote(value)}
                            disabled={roomState.phase !== GamePhase.VOTING}
                        />
                    </div>
                ))}
            </div>
            {roomState.phase === GamePhase.VOTING && !roomState.votes[currentUser?.id] && (
                <p className="text-center text-indigo-400 text-xs mt-2 animate-pulse font-medium">
                    Select a card to cast your vote
                </p>
            )}
        </div>

      </main>
    </div>
  );
}
