import { useVoicePlayer } from '@/hooks/useVoicePlayer';
import { RecordingFile, useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { prepareRecordingForSharing } from '@/utils/fileManager';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RecordingsScreen() {
    const router = useRouter();
    const {
        recordings,
        deleteRecording,
        renameRecording,
        storageStatus,
        chooseExternalFolder,
        useAppStorage,
    } = useVoiceRecorder();
    const { playSound, stopSound, isPlaying, playingUri, selectedPitch } = useVoicePlayer();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleShare = async (file: RecordingFile) => {
        try {
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            const shareUri = await prepareRecordingForSharing(file.uri, file.name);
            await Sharing.shareAsync(shareUri, {
                dialogTitle: 'Share recording',
                mimeType: 'audio/mp4',
            });
        } catch (error) {
            console.error('Failed to share recording', error);
            Alert.alert('Error', 'Failed to share recording');
        }
    };

    const startEditing = (file: RecordingFile) => {
        setEditingId(file.name);
        setEditName(file.name);
    };

    const saveRename = async (oldName: string) => {
        if (editName.trim() && editName !== oldName) {
            await renameRecording(oldName, editName);
        }
        setEditingId(null);
    };

    const handleChooseExternalFolder = async () => {
        const location = await chooseExternalFolder();
        if (location) {
            Alert.alert('Saved', 'New recordings will be saved to the selected Android Files folder.');
        }
    };

    const handleUseAppStorage = () => {
        Alert.alert('Use App Storage', 'New recordings will be saved inside the app again.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'OK', onPress: useAppStorage },
        ]);
    };

    const renderItem = ({ item }: { item: RecordingFile }) => {
        const isThisPlaying = isPlaying && playingUri === item.uri;
        const isEditing = editingId === item.name;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    {isEditing ? (
                        <TextInput
                            style={styles.input}
                            value={editName}
                            onChangeText={setEditName}
                            onBlur={() => saveRename(item.name)}
                            autoFocus
                        />
                    ) : (
                        <TouchableOpacity onLongPress={() => startEditing(item)} style={{ flex: 1 }}>
                            <Text style={styles.filename} numberOfLines={1} ellipsizeMode="middle">
                                {item.name}
                            </Text>
                            <Text style={styles.subtext}>Tap & Hold to Rename</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.actionButtons}>
                        <TouchableOpacity onPress={() => handleShare(item)} style={styles.iconBtn}>
                            <FontAwesome name="share-alt" size={20} color="#757575" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => Alert.alert('Delete', 'Are you sure?', [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => deleteRecording(item.name) }
                            ])}
                            style={styles.iconBtn}
                        >
                            <FontAwesome name="trash" size={20} color="#FF5252" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.controls}>
                    {/* Playback Controls */}
                    <View style={styles.effectRow}>
                        <EffectIcon
                            icon="paw"
                            label="Monster"
                            active={isThisPlaying && selectedPitch === 'LOW'}
                            onPress={() => playSound(item.uri, 'LOW')}
                        />
                        <EffectIcon
                            icon="smile-o"
                            label="Normal"
                            active={isThisPlaying && selectedPitch === 'NORMAL'}
                            onPress={() => playSound(item.uri, 'NORMAL')}
                        />
                        <EffectIcon
                            icon="rocket"
                            label="Alien"
                            active={isThisPlaying && selectedPitch === 'HIGH'}
                            onPress={() => playSound(item.uri, 'HIGH')}
                        />
                        {isThisPlaying && (
                            <TouchableOpacity style={styles.stopBtn} onPress={stopSound}>
                                <FontAwesome name="stop-circle" size={30} color="#D32F2F" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <FontAwesome name="arrow-left" size={24} color="#0288D1" />
                </TouchableOpacity>
                <Text style={styles.title}>My Recordings</Text>
            </View>

            <FlatList
                data={recordings}
                keyExtractor={(item) => item.name}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    storageStatus?.canSelectExternal ? (
                        <View style={styles.storagePanel}>
                            <View style={styles.storageTextArea}>
                                <Text style={styles.storageLabel}>Save Location</Text>
                                <Text style={styles.storageValue}>{storageStatus.label}</Text>
                            </View>
                            <View style={styles.storageButtons}>
                                <TouchableOpacity
                                    onPress={handleChooseExternalFolder}
                                    style={styles.storageButton}
                                >
                                    <FontAwesome name="folder-open" size={18} color="white" />
                                    <Text style={styles.storageButtonText}>Files</Text>
                                </TouchableOpacity>
                                {storageStatus.location.type === 'external' && (
                                    <TouchableOpacity
                                        onPress={handleUseAppStorage}
                                        style={[styles.storageButton, styles.secondaryStorageButton]}
                                    >
                                        <FontAwesome name="mobile" size={18} color="#0288D1" />
                                        <Text style={styles.secondaryStorageButtonText}>App</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No recordings yet!</Text>
                }
            />
        </SafeAreaView>
    );
}

function EffectIcon({ icon, label, active, onPress }: any) {
    return (
        <TouchableOpacity onPress={onPress} style={[styles.effectIcon, active && styles.effectActive]}>
            <FontAwesome name={icon} size={24} color={active ? 'white' : '#555'} />
            <Text style={[styles.effectText, active && { color: 'white' }]}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E1F5FE',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#B3E5FC',
    },
    backBtn: {
        padding: 10,
        marginRight: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0288D1',
        fontFamily: Platform.OS === 'ios' ? 'Marker Felt' : 'sans-serif-medium',
    },
    listContent: {
        padding: 20,
    },
    storagePanel: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    storageTextArea: {
        flex: 1,
    },
    storageLabel: {
        fontSize: 12,
        color: '#757575',
        marginBottom: 4,
    },
    storageValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    storageButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    storageButton: {
        minWidth: 74,
        minHeight: 42,
        borderRadius: 21,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: '#0288D1',
    },
    storageButtonText: {
        color: 'white',
        fontWeight: '700',
    },
    secondaryStorageButton: {
        backgroundColor: '#E1F5FE',
        borderWidth: 1,
        borderColor: '#81D4FA',
    },
    secondaryStorageButtonText: {
        color: '#0288D1',
        fontWeight: '700',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    filename: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    subtext: {
        fontSize: 12,
        color: '#999',
    },
    input: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        borderBottomWidth: 1,
        borderColor: '#0288D1',
        flex: 1,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    iconBtn: {
        padding: 8,
        marginLeft: 5,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    effectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    effectIcon: {
        alignItems: 'center',
        padding: 10,
        borderRadius: 10,
        backgroundColor: '#F5F5F5',
        minWidth: 70,
    },
    effectActive: {
        backgroundColor: '#009688',
    },
    effectText: {
        fontSize: 12,
        marginTop: 4,
        color: '#555',
    },
    stopBtn: {
        marginLeft: 10,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 18,
        color: '#999',
    },
});
