import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserType, GamePhase, FIBONACCI_DECK } from '../types';
import { AI_PERSONAS } from '../constants';
import { generateAiVote } from '../services/geminiService';
import { generateId, generateShortId } from '../lib/utils';

interface Player {
  id: string;
  name: string;
  type: UserType;
  avatarUrl: string;
  persona?: string;
}

interface RoomState {
  roomId: string;
  story: { title: string; description: string };
  phase: GamePhase;
  players: Player[];
  votes: Record<string, { playerId: string; value: number | string; reasoning?: string }>;
}

export function useSupabaseRoom(roomId: string | null, username: string) {
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [roomState, setRoomState] = useState<RoomState>({
    roomId: '',
    story: { title: '', description: '' },
    phase: GamePhase.SETUP,
    players: [],
    votes: {}
  });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomId || !username) return;

    // Get or generate a persistent user ID
    let userId = localStorage.getItem(`poker_user_id_${roomId}`);
    if (!userId) {
      userId = generateId();
      localStorage.setItem(`poker_user_id_${roomId}`, userId);
    }

    const currentUserData: Player = {
      id: userId,
      name: username,
      type: UserType.HUMAN,
      avatarUrl: `https://picsum.photos/100/100?random=${userId}`
    };
    setCurrentUser(currentUserData);

    loadRoomData(roomId, currentUserData.id, currentUserData);

    const roomChannel = `room:${roomId}`;

    // Listen for database changes
    const roomSubscription = supabase
      .channel(roomChannel)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('Room UPDATE received:', payload.eventType, payload.new);
          if (payload.eventType === 'UPDATE') {
            const newRoom = payload.new as any;
            setRoomState(prev => ({
              ...prev,
              roomId: roomId,
              story: { title: newRoom.story_title || '', description: newRoom.story_description || '' },
              phase: newRoom.phase || prev.phase
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPlayer = payload.new as any;
            setRoomState(prev => ({
              ...prev,
              players: [...prev.players, {
                id: newPlayer.id,
                name: newPlayer.name,
                type: newPlayer.type as UserType,
                avatarUrl: newPlayer.avatar_url,
                persona: newPlayer.persona
              }]
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setRoomState(prev => ({
              ...prev,
              players: prev.players.filter(p => p.id !== deletedId),
              votes: Object.fromEntries(
                Object.entries(prev.votes).filter(([_, v]) => (v as any).playerId !== deletedId)
              )
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newVote = payload.new as any;
            setRoomState(prev => ({
              ...prev,
              votes: {
                ...prev.votes,
                [newVote.player_id]: {
                  playerId: newVote.player_id,
                  value: newVote.value,
                  reasoning: newVote.reasoning
                }
              }
            }));
          } else if (payload.eventType === 'DELETE') {
            const deletedPlayerId = payload.old.player_id;
            setRoomState(prev => {
              const newVotes = { ...prev.votes };
              delete newVotes[deletedPlayerId];
              return { ...prev, votes: newVotes };
            });
          }
        }
      )
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      leaveRoom(roomId, currentUserData.id);
    };
  }, [roomId, username]);

  const loadRoomData = async (rid: string, userId: string, userData: Player) => {
    if (!supabase) {
      console.error('Supabase client not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      return;
    }

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', rid)
      .maybeSingle();

    if (roomData) {
      setRoomState(prev => ({
        ...prev,
        roomId: rid,
        story: { title: roomData.story_title || '', description: roomData.story_description || '' },
        phase: roomData.phase as GamePhase
      }));
    } else {
      // Room doesn't exist, create it
      await supabase.from('rooms').insert({
        id: rid,
        story_title: '',
        story_description: '',
        phase: GamePhase.SETUP
      });
    }

    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', rid);

    if (playersData) {
      const players: Player[] = playersData.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type as UserType,
        avatarUrl: p.avatar_url,
        persona: p.persona
      }));

      const humanPlayers = players.filter(p => p.type === UserType.HUMAN);
      if (!humanPlayers.find(p => p.id === userId)) {
        await joinRoom(rid, userId, userData);
      }

      setRoomState(prev => ({ ...prev, players }));
    }

    const { data: votesData } = await supabase
      .from('votes')
      .select('*')
      .eq('room_id', rid);

    if (votesData) {
      const votes: Record<string, any> = {};
      votesData.forEach(v => {
        votes[v.player_id] = {
          playerId: v.player_id,
          value: v.value,
          reasoning: v.reasoning
        };
      });
      setRoomState(prev => ({ ...prev, votes }));
    }
  };

  const joinRoom = async (rid: string, userId: string, user: Player) => {
    const { data: existingRoom } = await supabase
      .from('rooms')
      .select('id')
      .eq('id', rid)
      .maybeSingle();

    if (!existingRoom) {
      await supabase.from('rooms').insert({
        id: rid,
        story_title: '',
        story_description: '',
        phase: GamePhase.SETUP
      });
    }

    await supabase.from('players').insert({
      room_id: rid,
      id: userId,
      name: user.name,
      type: user.type,
      avatar_url: user.avatarUrl,
      persona: user.persona
    });
  };

  const leaveRoom = async (rid: string, userId: string) => {
    await supabase.from('players').delete().eq('room_id', rid).eq('id', userId);
  };

  const updateStory = async (story: { title: string; description: string }) => {
    await supabase
      .from('rooms')
      .update({ story_title: story.title, story_description: story.description })
      .eq('id', roomId);
  };

  const updatePhase = async (phase: GamePhase) => {
    console.log('Updating phase to:', phase, 'for room:', roomId);

    // Update local state immediately for the current user
    setRoomState(prev => ({
      ...prev,
      phase,
      votes: phase === GamePhase.VOTING ? {} : prev.votes
    }));

    // Update database and sync to other users
    await supabase
      .from('rooms')
      .update({ phase })
      .eq('id', roomId);

    if (phase === GamePhase.VOTING) {
      // Clear votes from database
      await supabase.from('votes').delete().eq('room_id', roomId);
    }
  };

  const addAiPlayers = async () => {
    if (!currentUser || !roomId) return;

    const shuffled = [...AI_PERSONAS].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    const existingIds = new Set(roomState.players.map(p => p.id));

    for (const persona of selected) {
      if (!existingIds.has(persona.id)) {
        await supabase.from('players').insert({
          room_id: roomId,
          id: persona.id,
          name: persona.name,
          type: UserType.AI,
          avatar_url: `https://picsum.photos/100/100?random=${persona.avatarSeed}`,
          persona: persona.description
        });
      }
    }
  };

  const triggerAiVotes = useCallback(async () => {
    if (roomState.phase !== GamePhase.VOTING) return;

    const aiPlayers = roomState.players.filter(p => p.type === UserType.AI);
    if (aiPlayers.length === 0) return;

    setIsProcessingAI(true);

    for (const player of aiPlayers) {
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 3000));

      const aiPersona = AI_PERSONAS.find(p => p.id === player.id);
      if (!aiPersona) continue;

      const result = await generateAiVote(roomState.story, aiPersona.name, aiPersona.role);

      await supabase.from('votes').upsert({
        id: `${roomId}-${player.id}`,
        room_id: roomId,
        player_id: player.id,
        value: result.points.toString(),
        reasoning: result.reasoning
      });
    }

    setIsProcessingAI(false);
  }, [roomState.phase, roomState.players, roomState.story, roomId]);

  useEffect(() => {
    if (roomState.phase === GamePhase.VOTING) {
      const aiPlayers = roomState.players.filter(p => p.type === UserType.AI);
      if (aiPlayers.length > 0 && !isProcessingAI) {
        const aiIds = aiPlayers.map(p => p.id);
        const hasAiVoted = aiIds.every(id => roomState.votes[id]);
        if (!hasAiVoted) {
          triggerAiVotes();
        }
      }
    }
  }, [roomState.phase, roomState.players, roomState.votes, isProcessingAI, triggerAiVotes]);

  const handleVote = async (value: number | string) => {
    if (!currentUser || roomState.phase !== GamePhase.VOTING) return;

    await supabase.from('votes').upsert({
      id: `${roomId}-${currentUser.id}`,
      room_id: roomId,
      player_id: currentUser.id,
      value: value.toString(),
      reasoning: undefined
    });
  };

  const copyInviteLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const createNewGame = async () => {
    if (!currentUser) return;

    const newId = generateShortId();
    window.location.href = `${window.location.pathname}?room=${newId}`;
  };

  const allVoted = roomState.players.length > 0 && roomState.players.every(p => !!roomState.votes[p.id]);

  return {
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
  };
}
