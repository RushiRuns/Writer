import React, { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { 
  Headphones, 
  Power,
  X
} from 'lucide-react';

interface SoundItem {
  id: string;
  name: string;
  localUrl: string;
  fallbackUrl: string;
}

const SOUND_LIST: SoundItem[] = [
  { id: 'rain', name: 'Rainfall', localUrl: './resources/sounds/rain.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2523/2523-84.wav' },
  { id: 'forest', name: 'Forest Birds', localUrl: './resources/sounds/forest.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/1190/1190-84.wav' },
  { id: 'ocean', name: 'Ocean Waves', localUrl: './resources/sounds/ocean.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-84.wav' },
  { id: 'cafe', name: 'Coffee Shop', localUrl: './resources/sounds/cafe.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2468/2468-84.wav' },
  { id: 'fire', name: 'Campfire', localUrl: './resources/sounds/fire.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2438/2438-84.wav' },
  { id: 'wind', name: 'Soft Wind', localUrl: './resources/sounds/wind.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2544/2544-84.wav' },
  { id: 'storm', name: 'Thunderstorm', localUrl: './resources/sounds/storm.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2550/2550-84.wav' },
  { id: 'train', name: 'Train Ride', localUrl: './resources/sounds/train.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2542/2542-84.wav' },
  { id: 'white', name: 'White Noise', localUrl: './resources/sounds/white.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav' },
  { id: 'brown', name: 'Brown Noise', localUrl: './resources/sounds/brown.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2569/2569-84.wav' },
  { id: 'drone', name: 'Focus Drone', localUrl: './resources/sounds/drone.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2560/2560-84.wav' },
  { id: 'night', name: 'Summer Night', localUrl: './resources/sounds/night.ogg', fallbackUrl: 'https://assets.mixkit.co/active_storage/sfx/2562/2562-84.wav' }
];

// Persistent module-level cache for looping Howl instances
const howlsCache: Record<string, Howl> = {};

interface AudioState {
  active: boolean;
  volume: number; // 0 to 1
}

export default function AudioManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [soundStates, setSoundStates] = useState<Record<string, AudioState>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Load sound configurations from settingsStore via preload
  useEffect(() => {
    const loadSoundSettings = async () => {
      try {
        const settings = await (window as any).wrriter.getSettings();
        const initialStates: Record<string, AudioState> = {};
        
        SOUND_LIST.forEach(sound => {
          const saved = settings?.sounds?.[sound.id];
          initialStates[sound.id] = {
            active: saved?.active ?? false,
            volume: saved?.volume ?? 0.5
          };
        });
        
        setSoundStates(initialStates);

        // Initialize and play active Howlers
        SOUND_LIST.forEach(sound => {
          const state = initialStates[sound.id];
          if (state.active) {
            getOrCreateHowl(sound, state.volume, true);
          }
        });
      } catch (err) {
        console.error('Failed to load audio settings:', err);
      }
    };
    loadSoundSettings();
  }, []);

  // Click outside to close panel listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Helper to fetch or initialize a looping Howl instance
  const getOrCreateHowl = (sound: SoundItem, volume: number, shouldPlay: boolean) => {
    if (!howlsCache[sound.id]) {
      howlsCache[sound.id] = new Howl({
        src: [sound.localUrl, sound.fallbackUrl],
        loop: true,
        volume: volume,
        preload: true
      });
    } else {
      howlsCache[sound.id].volume(volume);
    }

    const howl = howlsCache[sound.id];
    if (shouldPlay && !howl.playing()) {
      howl.play();
    } else if (!shouldPlay && howl.playing()) {
      howl.stop();
    }
    return howl;
  };

  // Toggle active/inactive states
  const toggleSound = async (sound: SoundItem) => {
    const currentState = soundStates[sound.id] || { active: false, volume: 0.5 };
    const nextActive = !currentState.active;
    
    const updatedState = {
      ...soundStates,
      [sound.id]: {
        ...currentState,
        active: nextActive
      }
    };
    
    setSoundStates(updatedState);
    getOrCreateHowl(sound, currentState.volume, nextActive);
    
    // Save settings back to electron-store
    try {
      await (window as any).wrriter.setSettings({ sounds: updatedState });
    } catch (err) {
      console.error('Failed to save audio toggles:', err);
    }
  };

  // Adjust volume sliders
  const handleVolumeChange = async (sound: SoundItem, volumeValue: number) => {
    const currentState = soundStates[sound.id] || { active: false, volume: 0.5 };
    
    const updatedState = {
      ...soundStates,
      [sound.id]: {
        ...currentState,
        volume: volumeValue
      }
    };
    
    setSoundStates(updatedState);
    
    if (howlsCache[sound.id]) {
      howlsCache[sound.id].volume(volumeValue);
    }

    try {
      await (window as any).wrriter.setSettings({ sounds: updatedState });
    } catch (err) {
      console.error('Failed to save audio volumes:', err);
    }
  };

  // Check if any sound is currently playing
  const isPlayingAny = Object.values(soundStates).some(s => s.active);

  return (
    <div className="relative" ref={panelRef}>
      {/* Headset Trigger Button in Top Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center p-2 rounded-md transition-all duration-200 border ${
          isOpen 
            ? 'bg-brand-amber/10 border-brand-amber text-brand-amber shadow'
            : isPlayingAny
              ? 'bg-neutral-900 border-brand-amber/40 text-brand-amber hover:text-brand-amber/80 hover:bg-neutral-800'
              : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
        }`}
        title="Ambient Sounds Mixer"
      >
        <Headphones size={15} className={isPlayingAny ? 'animate-pulse' : ''} />
      </button>

      {/* Floating Sound Mixer Panel Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[310px] bg-[#141414] border border-white/10 rounded-lg shadow-2xl p-4 z-[50] animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3.5">
            <div className="flex items-center gap-2">
              <Headphones size={16} className="text-brand-amber" />
              <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono">
                Ambient Sound Mixer
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Grid layout for 12 Sound controls */}
          <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
            {SOUND_LIST.map(sound => {
              const state = soundStates[sound.id] || { active: false, volume: 0.5 };
              return (
                <div 
                  key={sound.id} 
                  className={`flex items-center justify-between p-2 rounded border transition-all ${
                    state.active 
                      ? 'bg-neutral-900/60 border-brand-amber/20' 
                      : 'bg-neutral-950/20 border-transparent'
                  }`}
                >
                  {/* Active Toggle Power Button */}
                  <button
                    onClick={() => toggleSound(sound)}
                    className={`p-1.5 rounded transition-all mr-2.5 border ${
                      state.active
                        ? 'bg-brand-amber/20 border-brand-amber/35 text-brand-amber'
                        : 'bg-neutral-900 border-white/5 text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800'
                    }`}
                    title={state.active ? 'Mute' : 'Play'}
                  >
                    <Power size={11} />
                  </button>

                  {/* Info & volume slider details */}
                  <div className="flex-grow flex flex-col gap-1 pr-2 overflow-hidden">
                    <span className={`text-[11px] font-semibold truncate ${
                      state.active ? 'text-neutral-200' : 'text-neutral-500'
                    }`}>
                      {sound.name}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      disabled={!state.active}
                      value={state.volume}
                      onChange={(e) => handleVolumeChange(sound, parseFloat(e.target.value))}
                      className={`w-full accent-brand-amber bg-neutral-850 h-1 rounded-lg cursor-pointer transition-all ${
                        state.active ? 'opacity-100' : 'opacity-25'
                      }`}
                    />
                  </div>

                  {/* Volume level number indicator */}
                  <div className="flex items-center text-[10px] font-mono text-neutral-500 w-7 justify-end">
                    {state.active ? (
                      <span className="text-brand-amber font-semibold">{Math.round(state.volume * 100)}%</span>
                    ) : (
                      <span>OFF</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
