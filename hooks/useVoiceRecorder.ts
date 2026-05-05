import { Audio } from 'expo-av';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
    deleteRecording,
    getRecordingStorageStatus,
    getRecordings,
    RecordingStorageStatus,
    renameRecording,
    resetRecordingStorageLocation,
    saveRecording,
    selectExternalRecordingFolder,
} from '../utils/fileManager';

export interface RecordingFile {
    name: string;
    uri: string;
}

export function useVoiceRecorder() {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordings, setRecordings] = useState<RecordingFile[]>([]);
    const [latestRecordingUri, setLatestRecordingUri] = useState<string | null>(null);
    const [storageStatus, setStorageStatus] = useState<RecordingStorageStatus | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    const loadStorageStatus = useCallback(async () => {
        try {
            const status = await getRecordingStorageStatus();
            setStorageStatus(status);
        } catch (error) {
            console.error('Failed to load recording storage status', error);
        }
    }, []);

    const loadRecordings = useCallback(async () => {
        try {
            const files = await getRecordings();
            setRecordings(files.reverse()); // Newest first
        } catch (error) {
            console.error('Failed to load recordings', error);
        }
    }, []);

    useEffect(() => {
        loadStorageStatus();
        loadRecordings();
    }, [loadRecordings, loadStorageStatus]);

    const startRecording = useCallback(async () => {
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
    }, [permissionResponse?.status, requestPermission]);

    const stopRecording = useCallback(async () => {
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
    }, [loadRecordings, recording]);

    const handleDelete = useCallback(async (filename: string) => {
        try {
            await deleteRecording(filename);
            await loadRecordings();
        } catch (error) {
            Alert.alert('Error', 'Failed to delete recording');
        }
    }, [loadRecordings]);

    const handleRename = useCallback(async (oldName: string, newName: string) => {
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
    }, [loadRecordings]);

    const chooseExternalFolder = useCallback(async () => {
        try {
            const location = await selectExternalRecordingFolder();
            if (location) {
                await loadStorageStatus();
                await loadRecordings();
            }
            return location;
        } catch (error) {
            console.error('Failed to select external recording folder', error);
            Alert.alert('Error', 'Failed to select recording folder');
            return null;
        }
    }, [loadRecordings, loadStorageStatus]);

    const useAppStorage = useCallback(async () => {
        try {
            await resetRecordingStorageLocation();
            await loadStorageStatus();
            await loadRecordings();
        } catch (error) {
            console.error('Failed to reset recording storage location', error);
            Alert.alert('Error', 'Failed to reset recording folder');
        }
    }, [loadRecordings, loadStorageStatus]);

    return {
        recording,
        recordings,
        latestRecordingUri,
        storageStatus,
        startRecording,
        stopRecording,
        deleteRecording: handleDelete,
        renameRecording: handleRename,
        chooseExternalFolder,
        useAppStorage,
        refreshRecordings: loadRecordings
    };
}
