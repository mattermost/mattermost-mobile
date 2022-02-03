// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';

import DraftInput from '../draft_input';

type Props = {
    testID?: string;
    channelId: string;
    rootId: string;

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
}

export default function CursorPositionHandler(props: Props) {
    const [pos, setCursorPosition] = useState(0);

    return (
        <DraftInput
            {...props}
            cursorPosition={pos}
            updateCursorPosition={setCursorPosition}
        />
    );
}
