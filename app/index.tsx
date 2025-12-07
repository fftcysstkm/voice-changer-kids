import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VoiceChangerApp() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [selectedPitch, setSelectedPitch] = useState<'LOW' | 'NORMAL' | 'HIGH'>('NORMAL');
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    useEffect(() => {
        // Configure audio mode for recording and playback
        async function configureAudio() {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                    staysActiveInBackground: false,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });
            } catch (error) {
                console.error('Failed to set audio mode', error);
            }
        }
        configureAudio();
    }, []);

    // Cleanup sound on unmount or change
    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                const response = await requestPermission();
                if (response.status !== 'granted') {
                    Alert.alert('Permission needed', 'Please grant microphone permission to record voice.');
                    return;
                }
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    }

    async function stopRecording() {
        if (!recording) return;
        setRecording(null);
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setAudioUri(uri);
        // Reset sound if exists
        if (sound) {
            await sound.unloadAsync();
            setSound(null);
        }
    }

    async function playSound(pitch: 'LOW' | 'NORMAL' | 'HIGH') {
        if (!audioUri) return;

        // Visual feedback
        setSelectedPitch(pitch);

        try {
            // Ensure we can play
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
            });

            // If sound is already playing, stop and unload it first
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUri });
            setSound(newSound);

            // Pitch/Rate logic
            if (pitch === 'HIGH') {
                await newSound.setRateAsync(1.5, false);
            } else if (pitch === 'LOW') {
                await newSound.setRateAsync(0.7, false);
            } else {
                await newSound.setRateAsync(1.0, true);
            }

            await newSound.playAsync();
        } catch (error) {
            console.error('Failed to play sound', error);
            Alert.alert('Error', 'Failed to play sound');
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Voice Changer</Text>

            {/* Recording Area */}
            <View style={styles.recordContainer}>
                <TouchableOpacity
                    style={[styles.recordButton, recording && styles.recordingActive]}
                    onPress={recording ? stopRecording : startRecording}
                >
                    <FontAwesome
                        name={recording ? "stop" : "microphone"}
                        size={50}
                        color="white"
                    />
                </TouchableOpacity>
                <Text style={styles.statusText}>
                    {recording ? "Recording..." : "Tap to Record"}
                </Text>
            </View>

            {/* Pitch Selection / Playback Triggers */}
            <Text style={styles.instructionText}>
                {audioUri ? "Tap an icon to play!" : "Record first!"}
            </Text>
            <View style={styles.effectsContainer}>
                <EffectButton
                    type="LOW"
                    icon="paw"
                    color="#3F51B5"
                    label="Monster"
                    selected={selectedPitch === 'LOW'}
                    onPress={() => playSound('LOW')}
                    disabled={!audioUri}
                />
                <EffectButton
                    type="NORMAL"
                    icon="smile-o"
                    color="#4CAF50"
                    label="Normal"
                    selected={selectedPitch === 'NORMAL'}
                    onPress={() => playSound('NORMAL')}
                    disabled={!audioUri}
                />
                <EffectButton
                    type="HIGH"
                    icon="rocket"
                    color="#E91E63"
                    label="Alien"
                    selected={selectedPitch === 'HIGH'}
                    onPress={() => playSound('HIGH')}
                    disabled={!audioUri}
                />
            </View>

            {/* Spacer to keep layout balanced without Play button */}
            <View style={{ height: 100 }} />
        </SafeAreaView>
    );
}

function EffectButton({ type, icon, color, label, selected, onPress, disabled }: any) {
    return (
        <TouchableOpacity
            style={[
                styles.effectButton,
                { backgroundColor: color },
                selected && styles.effectButtonSelected,
                disabled && styles.effectButtonDisabled
            ]}
            onPress={onPress}
            disabled={disabled}
        >
            <FontAwesome name={icon} size={40} color="white" />
            <Text style={styles.effectLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E1F5FE',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#0288D1',
        marginTop: 20,
        fontFamily: Platform.OS === 'ios' ? 'Marker Felt' : 'sans-serif-medium', // Kid friendly font if available
    },
    recordContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    recordButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FF5252',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    recordingActive: {
        backgroundColor: '#D32F2F',
        borderWidth: 4,
        borderColor: '#FFCDD2',
    },
    statusText: {
        marginTop: 15,
        fontSize: 20,
        color: '#555',
        fontWeight: '600',
    },
    instructionText: {
        fontSize: 18,
        color: '#757575',
        marginBottom: 10,
        fontWeight: '500',
    },
    effectsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 20,
    },
    effectButton: {
        width: 90,
        height: 90,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        opacity: 0.9,
    },
    effectButtonSelected: {
        transform: [{ scale: 1.1 }],
        borderWidth: 3,
        borderColor: 'white',
        elevation: 10,
    },
    effectButtonDisabled: {
        opacity: 0.3,
        backgroundColor: '#BDBDBD',
    },
    effectLabel: {
        color: 'white',
        marginTop: 5,
        fontWeight: 'bold',
    },
});
