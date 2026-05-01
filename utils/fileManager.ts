import { Directory, File, Paths } from 'expo-file-system';

// We define usage of the 'recordings/' subdirectory within the document directory.
const recordingsDir = new Directory(Paths.document, 'recordings');

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

export const ensureDirExists = async () => {
    if (!recordingsDir.exists) {
        recordingsDir.create();
    }
};

export const getRecordings = async () => {
    await ensureDirExists();
    const files = recordingsDir.list();

    // Sort logic isn't strictly here in the old code (it was done in the hook via reverse())
    // but the old code assumed filter/map on the result of readDirectoryAsync (which returns names).
    // The new .list() returns File/Directory objects.

    return files
        .filter((item): item is File => item instanceof File && (item.name.endsWith('.m4a') || item.name.endsWith('.caf') || item.name.endsWith('.wav')))
        .map((file) => ({
            name: file.name,
            uri: file.uri,
        }));
};

export const deleteRecording = async (filename: string) => {
    const file = new File(recordingsDir, filename);
    if (file.exists) {
        file.delete();
    }
};

export const renameRecording = async (oldName: string, newName: string) => {
    const oldFile = new File(recordingsDir, oldName);
    const newFile = new File(recordingsDir, newName);

    // Determine if we need to rename or move. Since it's the same directory:
    if (oldFile.exists) {
        oldFile.rename(newName);
    }
};

export const saveRecording = async (uri: string) => {
    await ensureDirExists();
    const filename = `${formatRecordingTimestamp(new Date())}.m4a`;

    // The source uri might be in cache or elsewhere. 
    // We create a File object for the source.
    const sourceFile = new File(uri);

    // We want to move it to our recordings directory.
    // The .move() method on File takes a destination Directory or File.
    // If we pass a Directory, we assume we might need to specify the name, 
    // but .move(Directory) keeps the name? 
    // Wait, let's check the type definition again.
    // move(destination: Directory | File): void;

    // If we want to rename it AND move it, we should probably construct the target File object.
    const targetFile = new File(recordingsDir, filename);

    // sourceFile.move(targetFile) should work.
    if (sourceFile.exists) {
        sourceFile.move(targetFile);
    }

    return {
        name: filename,
        uri: targetFile.uri
    };
};
