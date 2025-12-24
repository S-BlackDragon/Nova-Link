// Notification sound utility using Web Audio API
// This creates a simple but pleasant notification tone

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
};

export const playNotificationSound = (type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Different tones for different notification types
        const frequencies: Record<string, number[]> = {
            info: [440, 550],      // Pleasant two-tone
            warning: [440, 350],   // Descending tone
            success: [440, 660],   // Ascending tone
            error: [300, 200],     // Deep warning tone
        };

        const tones = frequencies[type] || frequencies.info;
        const duration = 0.12;
        const gap = 0.05;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(tones[0], ctx.currentTime);
        oscillator.frequency.setValueAtTime(tones[1], ctx.currentTime + duration + gap);

        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + duration);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime + duration + gap);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + duration + gap + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + (duration * 2) + gap);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + (duration * 2) + gap + 0.05);
    } catch (e) {
        // Silently fail if audio context is not available
        console.warn('Could not play notification sound:', e);
    }
};

// Check if sounds are enabled in settings
export const isSoundEnabled = (): boolean => {
    try {
        const settings = JSON.parse(localStorage.getItem('mc_settings') || '{}');
        return settings.notificationSounds !== false; // Default to true
    } catch {
        return true;
    }
};

// Play sound only if enabled
export const playNotification = (type: 'info' | 'warning' | 'success' | 'error' = 'info') => {
    if (isSoundEnabled()) {
        playNotificationSound(type);
    }
};
