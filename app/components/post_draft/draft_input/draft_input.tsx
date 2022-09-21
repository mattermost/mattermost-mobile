// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Platform, ScrollView} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Typing from '../typing';

import MessageInput from './message_input';
import VoiceInput from './voice_input';

type Props = {
    testID?: string;
    channelId: string;
    rootId?: string;
    currentUserId: string;
    voiceMessageEnabled: boolean;

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
    updatePostInputTop: (top: number) => void;
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        inputContainer: {
            flex: 1,
            flexDirection: 'column',
        },
        inputContentContainer: {
            alignItems: 'stretch',
            paddingTop: Platform.select({
                ios: 7,
                android: 0,
            }),
        },
        inputWrapper: {
            alignItems: 'flex-end',
            flexDirection: 'row',
            justifyContent: 'center',
            paddingBottom: 2,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.20),
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
        },
    };
});

export default function DraftInput({
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
    updatePostInputTop,
    voiceMessageEnabled,
}: Props) {
    const theme = useTheme();

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    const [recording, setRecording] = useState(false);

    // Render
    const style = getStyleSheet(theme);

    return (
        <>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            <SafeAreaView
                edges={SAFE_AREA_VIEW_EDGES}
                onLayout={handleLayout}
                style={style.inputWrapper}
                testID={testID}
            >

                <ScrollView
                    style={style.inputContainer}
                    contentContainerStyle={style.inputContentContainer}
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    pinchGestureEnabled={false}
                    overScrollMode={'never'}
                    disableScrollViewPanResponder={true}
                >
                    {recording && (
                        <VoiceInput
                            addFiles={addFiles}
                            setRecording={setRecording}
                        />
                    )}
                    {!recording && (
                        <MessageInput
                            addFiles={addFiles}
                            canSend={canSend}
                            channelId={channelId}
                            currentUserId={currentUserId}
                            cursorPosition={cursorPosition}
                            files={files}
                            maxMessageLength={maxMessageLength}
                            sendMessage={sendMessage}
                            setRecording={setRecording}
                            updateCursorPosition={updateCursorPosition}
                            updateValue={updateValue}
                            uploadFileError={uploadFileError}
                            value={value}
                            rootId={rootId}
                            testID={testID}
                        />
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
