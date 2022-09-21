// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import SendAction from '../send_action';
import Typing from '../typing';
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
    updatePostInputTop: (top: number) => void;
}

const SAFE_AREA_VIEW_EDGES: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
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
}: Props) {
    const theme = useTheme();

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    const [recording, setRecording] = useState(false);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const showAsRecord = files[0]?.is_voice_recording;
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
                        <RecordComponent/>
                    )}
                    {!recording && (
                        <>
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
                                    setRecording={setRecording}
                                />
                            </View>
                        </>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
