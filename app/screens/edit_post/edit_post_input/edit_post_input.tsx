// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import PasteInput, {type PasteTextInputInstance} from '@mattermost/react-native-paste-input';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {type TextInputSelectionChangeEvent, View} from 'react-native';

import QuickActions from '@components/post_draft/quick_actions/';
import {INITIAL_PRIORITY} from '@components/post_draft/send_handler/send_handler';
import Uploads from '@components/post_draft/uploads';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import useDidMount from '@hooks/did_mount';
import {emptyFunction} from '@utils/general';
import {isMinimumServerVersion} from '@utils/helpers';
import {changeOpacity, getKeyboardAppearanceFromTheme, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';

const MAJOR_VERSION_TO_SHOW_ATTACHMENTS = 10;
const MINOR_VERSION_TO_SHOW_ATTACHMENTS = 5;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    input: {
        color: theme.centerChannelColor,
        padding: 15,
        textAlignVertical: 'top',
        flex: 1,
        ...typography('Body', 200),
    },
    inputContainer: {
        backgroundColor: theme.centerChannelBg,
        marginTop: 2,
        flex: 1,
    },
}));

type PostInputProps = {
    message: string;
    hasError: boolean;
    post: PostModel;
    postFiles: FileInfo[];
    version?: string;
    onTextSelectionChange: (curPos: number) => void;
    updateCursorPosition: React.Dispatch<React.SetStateAction<number>>;
    onChangeText: (text: string) => void;
    updateValue: React.Dispatch<React.SetStateAction<string>>;
    inputRef: React.MutableRefObject<PasteTextInputInstance | null>;
    addFiles: (file: FileInfo[]) => void;
}

const EditPostInput = ({
    message,
    onChangeText,
    onTextSelectionChange,
    updateCursorPosition,
    updateValue,
    hasError,
    post,
    postFiles,
    version,
    inputRef,
    addFiles,
}: PostInputProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const managedConfig = useManagedConfig<ManagedConfig>();
    const disableCopyAndPaste = managedConfig.copyAndPasteProtection === 'true';
    const {inputRef: keyboardInputRef, registerPostInputCallbacks, setCursorPosition} = useKeyboardState();

    // Sync prop ref → context ref so the KeyboardStateProvider's inputRef points to this input,
    // allowing InputQuickAction to call setSelection on the correct native view.
    useDidMount(() => {
        keyboardInputRef.current = inputRef.current;
    });

    const focus = useCallback(() => {
        inputRef.current?.focus();
    }, [inputRef]);

    // Register with KeyboardStateProvider so InputQuickAction can read/write cursor position.
    // updateValue and updateCursorPosition are stable setState dispatchers; message seeds
    // cursorPosition once at mount — ongoing tracking is handled by onSelectionChange.
    useDidMount(() => {
        registerPostInputCallbacks(updateValue, updateCursorPosition, message);
    });

    const inputStyle = useMemo(() => {
        return [styles.input];
    }, [styles]);

    const onSelectionChange = useCallback((event: TextInputSelectionChangeEvent) => {
        const curPos = event.nativeEvent.selection.end;
        onTextSelectionChange(curPos);
        setCursorPosition(curPos);
    }, [onTextSelectionChange, setCursorPosition]);

    const containerStyle = useMemo(() => [
        styles.inputContainer,
        hasError && {marginTop: 0},
    ], [styles, hasError]);

    return (
        <View style={containerStyle}>
            <PasteInput
                allowFontScaling={true}
                disableCopyPaste={disableCopyAndPaste}
                disableFullscreenUI={true}
                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                multiline={true}
                onChangeText={onChangeText}
                onPaste={emptyFunction}
                onSelectionChange={onSelectionChange}
                placeholder={intl.formatMessage({id: 'edit_post.editPost', defaultMessage: 'Edit the post...'})}
                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                ref={inputRef}
                smartPunctuation='disable'
                submitBehavior='newline'
                style={inputStyle}
                testID='edit_post.message.input'
                underlineColorAndroid='transparent'
                value={message}
            />
            {isMinimumServerVersion(version, MAJOR_VERSION_TO_SHOW_ATTACHMENTS, MINOR_VERSION_TO_SHOW_ATTACHMENTS) &&
                <>
                    <Uploads
                        channelId={post.channelId}
                        currentUserId={post.userId}
                        files={postFiles}
                        uploadFileError={null}
                        rootId={post.rootId}
                    />
                    <QuickActions
                        testID='edit_post.quick_actions'
                        fileCount={postFiles.length}
                        addFiles={addFiles}
                        updateValue={updateValue}
                        value={message}
                        updatePostPriority={emptyFunction}
                        canShowPostPriority={false}
                        postPriority={INITIAL_PRIORITY}
                        canShowSlashCommands={false}
                        canShowEmojiPicker={false}
                        focus={focus}
                    />
                </>
            }
        </View>
    );
};

EditPostInput.displayName = 'EditPostInput';

export default EditPostInput;
