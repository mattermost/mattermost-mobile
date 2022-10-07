// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleSheet, View} from 'react-native';

import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import SendAction from '../send_action';
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

const style = StyleSheet.create({
    actionsContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: Platform.select({
            ios: 1,
            android: 2,
        }),
    },
});

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
    canSend,
    updateValue,
    addFiles,
    updateCursorPosition,
    cursorPosition,
    setRecording,
}: Props) {
    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;

    const showAsRecord = files[0]?.is_voice_recording;
    return (
        <>
            {!showAsRecord &&
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
            }
            <Uploads
                currentUserId={currentUserId}
                files={files}
                uploadFileError={uploadFileError}
                channelId={channelId}
                rootId={rootId}
            />
            <View style={style.actionsContainer}>
                {!showAsRecord &&
                    <QuickActions
                        testID={quickActionsTestID}
                        fileCount={files.length}
                        addFiles={addFiles}
                        updateValue={updateValue}
                        value={value}
                    />
                }
                <SendAction
                    testID={sendActionTestID}
                    disabled={!canSend}
                    sendMessage={sendMessage}
                />
            </View>
        </>
    );
}
