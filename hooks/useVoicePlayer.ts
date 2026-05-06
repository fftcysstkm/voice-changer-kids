import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { Alert, NativeEventEmitter, NativeModules, Platform } from 'react-native';

type Pitch = 'LOW' | 'NORMAL' | 'HIGH';

type AndroidPitchPlayerModule = {
    play: (uri: string, pitch: number) => Promise<void>;
    stop: () => Promise<void>;
    addListener: (eventName: string) => void;
    removeListeners: (count: number) => void;
};

const androidPitchPlayer =
    Platform.OS === 'android'
        ? (NativeModules.AndroidPitchPlayer as AndroidPitchPlayerModule | undefined)
        : undefined;

const androidPitchEvents = androidPitchPlayer ? new NativeEventEmitter(androidPitchPlayer) : undefined;

const getPitchScale = (pitch: Pitch) => {
    if (pitch === 'HIGH') {
        return 1.5;
    }
    if (pitch === 'LOW') {
        return 0.7;
    }
    return 1.0;
};

export function useVoicePlayer() {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playingUri, setPlayingUri] = useState<string | null>(null);
    const [selectedPitch, setSelectedPitch] = useState<Pitch>('NORMAL');

    // Cleanup sound on unmount/change
    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    useEffect(() => {
        if (!androidPitchEvents) {
            return undefined;
        }

        const finishSubscription = androidPitchEvents.addListener('AndroidPitchPlayerFinished', () => {
            setIsPlaying(false);
            setPlayingUri(null);
        });
        const errorSubscription = androidPitchEvents.addListener('AndroidPitchPlayerError', () => {
            setIsPlaying(false);
            setPlayingUri(null);
            Alert.alert('Error', 'Failed to play sound');
        });

        return () => {
            finishSubscription.remove();
            errorSubscription.remove();
            androidPitchPlayer?.stop().catch((error) => {
                console.error('Failed to stop native pitch player', error);
            });
        };
    }, []);

    async function playSound(uri: string, pitch: Pitch) {
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
                setSound(null);
            }

            if (androidPitchPlayer) {
                await androidPitchPlayer.stop();
                await androidPitchPlayer.play(uri, getPitchScale(pitch));
                return;
            }

            if (Platform.OS === 'android' && pitch !== 'NORMAL') {
                throw new Error('Android native pitch player is not available.');
            }

            const { sound: newSound } = await Audio.Sound.createAsync({ uri });
            setSound(newSound);

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
        if (androidPitchPlayer) {
            await androidPitchPlayer.stop();
        }
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
            setPlayingUri(null);
        }
        setIsPlaying(false);
        setPlayingUri(null);
    }

    return {
        playSound,
        stopSound,
        isPlaying,
        playingUri,
        selectedPitch
    };
}
