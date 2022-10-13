// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import QuickActions from '@components/post_draft/quick_actions';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import RecordAction from '../record_action';
import SendAction from '../send_action';
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
        sendVoiceMessage: {
            position: 'absolute',
            right: -5,
            top: 16,
        },
    };
});

export default function DraftInput({
    addFiles,
    canSend,
    channelId,
    currentUserId,
    cursorPosition,
    files,
    maxMessageLength,
    rootId = '',
    sendMessage,
    testID,
    updateCursorPosition,
    updatePostInputTop,
    updateValue,
    uploadFileError,
    value,
    voiceMessageEnabled,
}: Props) {
    const [recording, setRecording] = useState(false);
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    const onPresRecording = useCallback(() => {
        setRecording(true);
    }, []);

    const onCloseRecording = useCallback(() => {
        setRecording(false);
    }, []);

    const isHandlingVoice = files[0]?.is_voice_recording;
    const sendActionTestID = `${testID}.send_action`;
    const recordActionTestID = `${testID}.record_action`;

    const getActionButton = useCallback(() => {
        if (value.length === 0 && files.length === 0 && voiceMessageEnabled) {
            return (
                <RecordAction
                    onPress={onPresRecording}
                    testID={recordActionTestID}
                />
            );
        }

        return (
            <SendAction
                disabled={!canSend}
                sendMessage={sendMessage}
                testID={sendActionTestID}
            />
        );
    }, [
        canSend,
        files.length,
        onCloseRecording,
        onPresRecording,
        sendMessage,
        testID,
        value.length,
        voiceMessageEnabled,
        isHandlingVoice,
    ]);

    const quickActionsTestID = `${testID}.quick_actions`;

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
                    contentContainerStyle={style.inputContentContainer}
                    disableScrollViewPanResponder={true}
                    keyboardShouldPersistTaps={'always'}
                    overScrollMode={'never'}
                    pinchGestureEnabled={false}
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    style={style.inputContainer}
                >
                    {recording && (
                        <VoiceInput
                            addFiles={addFiles}
                            onClose={onCloseRecording}
                            setRecording={setRecording}
                        />
                    )}
                    {!recording &&
                        <>
                            <MessageInput
                                addFiles={addFiles}
                                canSend={canSend}
                                channelId={channelId}
                                currentUserId={currentUserId}
                                cursorPosition={cursorPosition}
                                files={files}
                                maxMessageLength={maxMessageLength}
                                rootId={rootId}
                                sendMessage={sendMessage}
                                setRecording={setRecording}
                                testID={testID}
                                updateCursorPosition={updateCursorPosition}
                                updateValue={updateValue}
                                uploadFileError={uploadFileError}
                                value={value}
                            />
                            <View style={style.actionsContainer}>
                                {!isHandlingVoice &&
                                    <QuickActions
                                        testID={quickActionsTestID}
                                        fileCount={files.length}
                                        addFiles={addFiles}
                                        updateValue={updateValue}
                                        value={value}
                                    />
                                }
                                {!isHandlingVoice && getActionButton()}
                            </View>
                            {isHandlingVoice &&
                                <SendAction
                                    disabled={!canSend}
                                    sendMessage={sendMessage}
                                    testID={sendActionTestID}
                                    containerStyle={isHandlingVoice && style.sendVoiceMessage}
                                />
                            }
                        </>
                    }
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
