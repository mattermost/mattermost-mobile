// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';

import DraftInput from '../draft_input';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;
    screenId: string;

    // Send Handler
    sendMessage: () => void;
    maxMessageLength: number;
    canSend: boolean;

    // Draft Handler
    value: string;
    uploadFileError: React.ReactNode;
    files: FileInfo[];
    clearDraft: () => void;
    updateValue: (value: string) => void;
    addFiles: (files: FileInfo[]) => void;
    removeFile: (file: FileInfo) => void;
    retryFileUpload: (file: FileInfo) => void;
}

export default function CursorPositionHandler(props: Props) {
    const [pos, setCursorPosition] = useState(0);
    const updateCursorPosition = useCallback((newPos: number) => {
        setCursorPosition(newPos);
    }, []);

    return (
        <DraftInput
            {...props}
            cursorPosition={pos}
            updateCursorPosition={updateCursorPosition}
        />
    );
}
