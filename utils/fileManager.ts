import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

// We define usage of the 'recordings/' subdirectory within the document directory.
const recordingsDir = new Directory(Paths.document, 'recordings');
const storageSettingsFile = new File(Paths.document, 'recording-storage.json');
const audioMimeType = 'audio/mp4';
const recordingExtensions = ['.m4a', '.caf', '.wav'];

export type RecordingStorageLocation =
    | { type: 'app' }
    | { type: 'external'; directoryUri: string };

export type RecordingStorageStatus = {
    location: RecordingStorageLocation;
    label: string;
    canSelectExternal: boolean;
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const formatRecordingTimestamp = (date: Date) => {
    const datePart = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join('');
    const timePart = [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
    ].join('');

    return `${datePart}-${timePart}-${pad(date.getMilliseconds(), 3)}`;
};

const isRecordingFileName = (name: string) => recordingExtensions.some((extension) => name.endsWith(extension));

const normalizeRecordingName = (name: string) => name.trim();

const getFileNameFromUri = (uri: string) => {
    const decodedUri = decodeURIComponent(uri);
    const withoutQuery = decodedUri.split('?')[0];
    const lastSlashPart = withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1);
    const lastSafPathPart = lastSlashPart.substring(lastSlashPart.lastIndexOf(':') + 1);

    return lastSafPathPart || withoutQuery;
};

const readStorageLocation = async (): Promise<RecordingStorageLocation> => {
    if (!storageSettingsFile.exists) {
        return { type: 'app' };
    }

    try {
        const settings = JSON.parse(await storageSettingsFile.text()) as Partial<RecordingStorageLocation>;
        if (settings.type === 'external' && typeof settings.directoryUri === 'string') {
            return {
                type: 'external',
                directoryUri: settings.directoryUri,
            };
        }
    } catch (error) {
        console.warn('Failed to read recording storage settings', error);
    }

    return { type: 'app' };
};

const writeStorageLocation = async (location: RecordingStorageLocation) => {
    storageSettingsFile.write(JSON.stringify(location));
};

const clearStorageLocation = async () => {
    if (storageSettingsFile.exists) {
        storageSettingsFile.delete();
    }
};

export const ensureDirExists = async () => {
    if (!recordingsDir.exists) {
        recordingsDir.create();
    }
};

export const getRecordingStorageStatus = async (): Promise<RecordingStorageStatus> => {
    const location = await readStorageLocation();

    return {
        location,
        label: location.type === 'external' ? 'Android Files selected folder' : 'App storage',
        canSelectExternal: Platform.OS === 'android',
    };
};

export const selectExternalRecordingFolder = async () => {
    if (Platform.OS !== 'android') {
        throw new Error('External folder selection is only available on Android.');
    }

    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
        return null;
    }

    const location: RecordingStorageLocation = {
        type: 'external',
        directoryUri: permissions.directoryUri,
    };

    await writeStorageLocation(location);
    return location;
};

export const resetRecordingStorageLocation = async () => {
    await clearStorageLocation();
};

const getExternalRecordings = async (directoryUri: string) => {
    const fileUris = await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);

    return fileUris
        .map((uri) => ({
            name: getFileNameFromUri(uri),
            uri,
        }))
        .filter((file) => isRecordingFileName(file.name));
};

const findExternalRecordingUri = async (directoryUri: string, filename: string) => {
    const files = await getExternalRecordings(directoryUri);
    return files.find((file) => file.name === filename)?.uri ?? null;
};

const findExternalRecordingUriByNames = async (directoryUri: string, filenames: string[]) => {
    const files = await getExternalRecordings(directoryUri);
    return files.find((file) => filenames.includes(file.name)) ?? null;
};

export const getRecordings = async () => {
    const storageLocation = await readStorageLocation();

    if (storageLocation.type === 'external') {
        return getExternalRecordings(storageLocation.directoryUri);
    }

    await ensureDirExists();
    const files = recordingsDir.list();

    // Sort logic isn't strictly here in the old code (it was done in the hook via reverse())
    // but the old code assumed filter/map on the result of readDirectoryAsync (which returns names).
    // The new .list() returns File/Directory objects.

    return files
        .filter((item): item is File => item instanceof File && isRecordingFileName(item.name))
        .map((file) => ({
            name: file.name,
            uri: file.uri,
        }));
};

export const deleteRecording = async (filename: string) => {
    const storageLocation = await readStorageLocation();

    if (storageLocation.type === 'external') {
        const fileUri = await findExternalRecordingUri(storageLocation.directoryUri, filename);
        if (fileUri) {
            await FileSystem.StorageAccessFramework.deleteAsync(fileUri, { idempotent: true });
        }
        return;
    }

    const file = new File(recordingsDir, filename);
    if (file.exists) {
        file.delete();
    }
};

export const renameRecording = async (oldName: string, newName: string) => {
    const storageLocation = await readStorageLocation();
    const finalName = normalizeRecordingName(newName);

    if (!finalName) {
        return;
    }

    if (storageLocation.type === 'external') {
        const oldFileUri = await findExternalRecordingUri(storageLocation.directoryUri, oldName);
        if (!oldFileUri) {
            return;
        }

        const base64Contents = await FileSystem.StorageAccessFramework.readAsStringAsync(oldFileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const newFileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            storageLocation.directoryUri,
            finalName,
            audioMimeType
        );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(newFileUri, base64Contents, {
            encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.StorageAccessFramework.deleteAsync(oldFileUri, { idempotent: true });
        return;
    }

    const oldFile = new File(recordingsDir, oldName);

    // Determine if we need to rename or move. Since it's the same directory:
    if (oldFile.exists) {
        oldFile.rename(finalName);
    }
};

export const saveRecording = async (uri: string) => {
    const storageLocation = await readStorageLocation();
    const filename = `${formatRecordingTimestamp(new Date())}.m4a`;

    if (storageLocation.type === 'external') {
        const base64Contents = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
            storageLocation.directoryUri,
            filename,
            audioMimeType
        );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, base64Contents, {
            encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.deleteAsync(uri, { idempotent: true });

        const savedFile = await findExternalRecordingUriByNames(storageLocation.directoryUri, [
            filename,
            getFileNameFromUri(targetUri),
        ]);

        return {
            name: savedFile?.name ?? getFileNameFromUri(targetUri),
            uri: savedFile?.uri ?? targetUri,
        };
    }

    await ensureDirExists();
    const sourceFile = new File(uri);
    const targetFile = new File(recordingsDir, filename);

    if (sourceFile.exists) {
        sourceFile.move(targetFile);
    }

    return {
        name: filename,
        uri: targetFile.uri
    };
};
