// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import PostInput from '@components/post_draft/post_input';
import QuickActions from '@components/post_draft/quick_actions';
import SendAction from '@components/post_draft/send_action';
import Typing from '@components/post_draft/typing';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Uploads from '../uploads';

type Props = {
    testID?: string;
    channelDisplayName?: string;
    channelId: string;
    rootId?: string;

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
    removeFile: (file: FileInfo) => void;
    retryFileUpload: (file: FileInfo) => void;
}

export default function DraftInput({
    testID,
    channelDisplayName,
    channelId,
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
    removeFile,
    retryFileUpload,
}: Props) {
    const theme = useTheme();

    // const [top, setTop] = useState(0);

    // Did mount
    // useEffect(() => {
    //     HWKeyboardEvent.onHWKeyPressed(handleHardwareEnterPress)
    //     return () => {
    //         HWKeyboardEvent.removeOnHWKeyPressed();
    //     }
    // })

    // const handleHardwareEnterPress = (keyEvent) => {
    //     if (HW_EVENT_IN_SCREEN.includes(EphemeralStore.getNavigationTopComponentId())) {
    //         switch (keyEvent.pressedKey) {
    //         case 'enter':
    //             handleSendMessage();
    //             break;
    //         case 'shift-enter':
    //             onInsertTextToDraft(HW_SHIFT_ENTER_TEXT);
    //             break;
    //         }
    //     }
    // }

    // const handleLayout = useCallback((e: LayoutChangeEvent) => {
    //     setTop(e.nativeEvent.layout.y);
    // }, []);

    // Render
    const postInputTestID = `${testID}.post.input`;
    const quickActionsTestID = `${testID}.quick_actions`;
    const sendActionTestID = `${testID}.send_action`;
    const style = getStyleSheet(theme);

    return (
        <>
            <Typing
                channelId={channelId}
                rootId={rootId}
            />
            {/* {Platform.OS === 'android' &&
            <Autocomplete
                maxHeight={Math.min(top - AUTOCOMPLETE_MARGIN, DEVICE.AUTOCOMPLETE_MAX_HEIGHT)}
                onChangeText={handleInputQuickAction}
                rootId={rootId}
                channelId={channelId}
                offsetY={0}
            />
            } */}
            <SafeAreaView
                edges={['left', 'right']}

                // onLayout={handleLayout}
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
                    <PostInput
                        testID={postInputTestID}
                        channelDisplayName={channelDisplayName}
                        channelId={channelId}
                        maxMessageLength={maxMessageLength}
                        rootId={rootId}
                        cursorPosition={cursorPosition}
                        updateCursorPosition={updateCursorPosition}
                        updateValue={updateValue}
                        value={value}
                        updateFiles={addFiles}
                    />
                    <Uploads
                        files={files}
                        removeFile={removeFile}
                        retryFileUpload={retryFileUpload}
                        uploadFileError={uploadFileError}
                    />
                    <View style={style.actionsContainer}>
                        <QuickActions
                            testID={quickActionsTestID}
                            fileCount={files.length}
                            addFiles={addFiles}
                            updateValue={updateValue}
                            value={value}
                        />
                        <SendAction
                            testID={sendActionTestID}
                            disabled={!canSend}
                            sendMessage={sendMessage}
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

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
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
        },
    };
});
