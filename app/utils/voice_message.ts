// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {File} from 'expo-file-system';

import {generateId} from '@utils/general';

export const VOICE_MESSAGE_MIME_TYPE = 'audio/mp4';

export function createVoiceMessageFile(uri: string, timestamp = Date.now()): ExtractedFileInfo {
    const info = new File(uri).info();
    if (!info.exists || !info.size) {
        throw new Error('The voice recording is empty or unavailable');
    }

    return {
        clientId: generateId(),
        loading: true,
        localPath: uri,
        mime_type: VOICE_MESSAGE_MIME_TYPE,
        name: `voice-message-${timestamp}.m4a`,
        progress: 0,
        size: info.size,
    } as ExtractedFileInfo;
}
