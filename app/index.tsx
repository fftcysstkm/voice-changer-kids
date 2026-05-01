import { useVoicePlayer } from '@/hooks/useVoicePlayer';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VoiceChangerApp() {
    const router = useRouter();
    const { recording, startRecording, stopRecording, latestRecordingUri } = useVoiceRecorder();
    const { playSound, stopSound, isPlaying, playingUri } = useVoicePlayer();

    // State for showing the "Saved" message
    const [showSavedMessage, setShowSavedMessage] = useState(false);
    const fadeAnim = useState(new Animated.Value(0))[0];

    // Use a local effect for the 30s timer
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (recording) {
            timer = setTimeout(async () => {
                await stopRecording();
                Alert.alert('お知らせ', '30秒経過したため録音を終了しました');
            }, 30000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [recording]);

    // Effect to handle "Saved" message visibility and fading
    useEffect(() => {
        if (latestRecordingUri) {
            setShowSavedMessage(true);
            // Fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start();

            // Hide after 3 seconds
            const hideTimer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start(() => setShowSavedMessage(false));
            }, 3000);

            return () => clearTimeout(hideTimer);
        }
    }, [latestRecordingUri]);

    const handlePlayLatest = () => {
        if (latestRecordingUri) {
            if (isPlaying) {
                stopSound();
            } else {
                playSound(latestRecordingUri, 'NORMAL');
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Voice Changer</Text>

            {/* Status Message Area */}
            <View style={styles.messageContainer}>
                {showSavedMessage && (
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={styles.savedText}>Recording Saved! 🎉</Text>
                    </Animated.View>
                )}
            </View>

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

                {/* Immediate Playback Controls */}
                {!recording && latestRecordingUri && (
                    <View style={styles.playbackContainer}>
                        <TouchableOpacity
                            style={styles.playButton}
                            onPress={handlePlayLatest}
                        >
                            <FontAwesome
                                name={isPlaying ? "stop" : "play"}
                                size={24}
                                color="white"
                            />
                            <Text style={styles.playButtonText}>
                                {isPlaying ? "Stop" : "Play Last Recording"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.navigationContainer}>
                <TouchableOpacity
                    style={styles.listButton}
                    onPress={() => router.push('/recordings' as any)}
                >
                    <FontAwesome name="list-ul" size={24} color="white" style={{ marginRight: 10 }} />
                    <Text style={styles.listButtonText}>Go to Recordings</Text>
                </TouchableOpacity>
            </View>

            {/* Spacer */}
            <View style={{ height: 50 }} />
        </SafeAreaView>
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
        fontFamily: Platform.OS === 'ios' ? 'Marker Felt' : 'sans-serif-medium',
    },
    messageContainer: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    savedText: {
        fontSize: 20,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    recordContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
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
        marginTop: 20,
        fontSize: 24,
        color: '#555',
        fontWeight: '600',
    },
    playbackContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    playButton: {
        flexDirection: 'row',
        backgroundColor: '#2196F3',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: 'center',
        elevation: 3,
    },
    playButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    navigationContainer: {
        width: '100%',
        paddingHorizontal: 40,
        marginBottom: 20,
    },
    listButton: {
        flexDirection: 'row',
        backgroundColor: '#009688',
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
    },
    listButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
