// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import PostInput from '../post_input';
import Uploads from '../uploads';

type Props = {
    testID?: string;
    channelId: string;
    rootId?: string;
    currentUserId: string;

    // Cursor Position Handler
    updateCursorPosition: (pos: number) => void;
    cursorPosition: number;

    // Send Handler
    sendMessage: () => void;
    canSend: boolean;
    maxMessageLength: number;

    // Draft Handler
    files: FileInfo[];
    value: string;
    uploadFileError: React.ReactNode;
    updateValue: (value: string) => void;
    addFiles: (files: FileInfo[]) => void;
    setRecording: (v: boolean) => void;
}

export default function MessageInput({
    testID,
    channelId,
    currentUserId,
    files,
    maxMessageLength,
    rootId = '',
    value,
    uploadFileError,
    sendMessage,
    updateValue,
    addFiles,
    updateCursorPosition,
    cursorPosition,
}: Props) {
    // Render
    const postInputTestID = `${testID}.post.input`;
    const isHandlingVoice = files[0]?.is_voice_recording;

    return (
        <>
            {!isHandlingVoice && (
                <PostInput
                    testID={postInputTestID}
                    channelId={channelId}
                    maxMessageLength={maxMessageLength}
                    rootId={rootId}
                    cursorPosition={cursorPosition}
                    updateCursorPosition={updateCursorPosition}
                    updateValue={updateValue}
                    value={value}
                    addFiles={addFiles}
                    sendMessage={sendMessage}
                />
            )}
            <Uploads
                currentUserId={currentUserId}
                files={files}
                uploadFileError={uploadFileError}
                channelId={channelId}
                rootId={rootId}
            />
        </>
    );
}
