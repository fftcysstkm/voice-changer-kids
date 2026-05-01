import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { deleteRecording, getRecordings, renameRecording, saveRecording } from '../utils/fileManager';

export interface RecordingFile {
    name: string;
    uri: string;
}

export function useVoiceRecorder() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordings, setRecordings] = useState<RecordingFile[]>([]);
    const [latestRecordingUri, setLatestRecordingUri] = useState<string | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    useEffect(() => {
        loadRecordings();
    }, []);

    const loadRecordings = async () => {
        try {
            const files = await getRecordings();
            setRecordings(files.reverse()); // Newest first
        } catch (error) {
            console.error('Failed to load recordings', error);
        }
    };

    async function startRecording() {
        try {
            // Reset latest recording status when starting new one
            setLatestRecordingUri(null);

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

        try {
            // 1. Stop recording
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null); // Clear state immediately

            if (uri) {
                // 2. Auto-save
                const savedFile = await saveRecording(uri);
                // 3. Refresh list
                await loadRecordings();
                // 4. Set latest recording for immediate playback
                setLatestRecordingUri(savedFile.uri);

                // Alert removed as requested
                // Alert.alert('Saved', 'Recording saved successfully!');
            }
        } catch (error) {
            console.error('Failed to stop/save recording', error);
            Alert.alert('Error', 'Failed to save recording');
        }
    }

    const handleDelete = async (filename: string) => {
        try {
            await deleteRecording(filename);
            await loadRecordings();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete recording');
        }
    };

    const handleRename = async (oldName: string, newName: string) => {
        try {
            // Ensure extension is kept or added if missing
            let finalName = newName;
            if (!finalName.endsWith('.m4a')) { // Assuming m4a for now as default from iOS/high quality
                if (oldName.endsWith('.m4a')) finalName += '.m4a';
            }

            await renameRecording(oldName, finalName);
            await loadRecordings();
        } catch (error) {
            Alert.alert('Error', 'Failed to rename recording');
        }
    };

    return {
        recording,
        recordings,
        latestRecordingUri,
        startRecording,
        stopRecording,
        deleteRecording: handleDelete,
        renameRecording: handleRename,
        refreshRecordings: loadRecordings
    };
}
