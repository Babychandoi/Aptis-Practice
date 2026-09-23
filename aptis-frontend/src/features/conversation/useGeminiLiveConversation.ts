import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { LiveConversationRoom } from './liveRoom';
export type { ConversationStatus, TranscriptLine } from './liveRoom';

export function useGeminiLiveConversation(topic: string, level: string, voice: string, freshStart = false) {
  const [room] = useState(() => new LiveConversationRoom());
  const state = useSyncExternalStore(room.subscribe, room.getSnapshot);
  const start = useCallback(() => room.start({ topic, level, voice, freshStart }), [room, topic, level, voice, freshStart]);
  const stop = useCallback(() => room.stop(), [room]);
  useEffect(() => {
    const visibility = () => { if (document.visibilityState === 'visible') room.resumeAudio(); };
    const pageHide = () => { void room.stop(); };
    window.addEventListener('online', room.networkChanged);
    window.addEventListener('offline', room.networkChanged);
    window.addEventListener('pagehide', pageHide);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('online', room.networkChanged);
      window.removeEventListener('offline', room.networkChanged);
      window.removeEventListener('pagehide', pageHide);
      document.removeEventListener('visibilitychange', visibility);
      void room.stop();
    };
  }, [room]);
  return { ...state, start, stop, resumeAudio: room.resumeAudio };
}
