import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

export function useVoicePlayer() {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingUri, setPlayingUri] = useState<string | null>(null);
    const [selectedPitch, setSelectedPitch] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');

    // Cleanup sound on unmount/change
    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    async function playSound(uri: string, pitch: 'LOW' | 'NORMAL' | 'HIGH') {
        try {
            // Update state for UI
            setPlayingUri(uri);
            setSelectedPitch(pitch);
            setIsPlaying(true);

            // Audio Mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            // Unload previous sound if any
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync({ uri });
            setSound(newSound);

            // Pitch/Rate logic
            // Note: setRateAsync(rate, shouldCorrectPitch)
            // shouldCorrectPitch = true means change speed but keep pitch?
            // Wait, Voice Changer usually WANTS to change pitch.
            // High pitch = faster speed usually in simple implementations?
            // Actually:
            // High pitch (Alien) -> higher rate (1.5), pitch correction depends on desired effect.
            // Original app logic:
            // HIGH: rate 1.5, correct false (chipmunk effect)
            // LOW: rate 0.7, correct false (slow/monster effect)
            // NORMAL: rate 1.0, correct true

            if (pitch === 'HIGH') {
                await newSound.setRateAsync(1.5, false);
            } else if (pitch === 'LOW') {
                await newSound.setRateAsync(0.7, false);
            } else {
                await newSound.setRateAsync(1.0, true);
            }

            // Add finish listener to reset state
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    setPlayingUri(null);
                }
            });

            await newSound.playAsync();

        } catch (error) {
            console.error('Failed to play sound', error);
            Alert.alert('Error', 'Failed to play sound');
            setIsPlaying(false);
            setPlayingUri(null);
        }
    }

    const stopSound = async () => {
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
            setPlayingUri(null);
        }
    }

    return {
        playSound,
        stopSound,
        isPlaying,
        playingUri,
        selectedPitch
    };
}
