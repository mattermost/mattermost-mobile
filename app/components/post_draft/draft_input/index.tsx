// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, Platform, ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import RecordContainer from '@components/post_draft/record_container';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput from '../post_input';
import QuickActions from '../quick_actions';
import RecordAction from '../record_action';
import SendAction from '../send_action';
import Typing from '../typing';
import Uploads from '../uploads';

//fixme:to read config to know if we can record or not

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
    const [isRecording, setIsRecording] = useState(false);
    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        updatePostInputTop(e.nativeEvent.layout.height);
    }, []);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    const onPresRecord = useCallback(() => {
        setIsRecording(true);
    }, []);

    const getActionButton = useCallback(() => {
        if (value.length === 0 && files.length === 0) { // add config condition to it
            return (
                <RecordAction
                    onPress={onPresRecord}
                />
            );
        }

        return (
            <SendAction
                testID={sendActionTestID}
                disabled={!canSend}
                sendMessage={sendMessage}
            />
        );
    }, [value]);

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
                    {
                        isRecording && (
                            <RecordContainer/>
                        )
                    }
                    {!isRecording && (
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
                    {!isRecording && (
                        <View style={style.actionsContainer}>
                            <QuickActions
                                testID={quickActionsTestID}
                                fileCount={files.length}
                                addFiles={addFiles}
                                updateValue={updateValue}
                                value={value}
                            />
                            {getActionButton()}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
