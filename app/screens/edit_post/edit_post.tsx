// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Keyboard, type LayoutChangeEvent, Platform, SafeAreaView, View, StyleSheet} from 'react-native';

import {deletePost, editPost} from '@actions/remote/post';
import Autocomplete from '@components/autocomplete';
import Loading from '@components/loading';
import {EditPostProvider} from '@context/edit_post';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useKeyboardOverlap} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useInputPropagation} from '@hooks/input';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import SecurityManager from '@managers/security_manager';
import PostError from '@screens/edit_post/post_error';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import EditPostInput from './edit_post_input';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

const AUTOCOMPLETE_SEPARATION = 8;

const styles = StyleSheet.create({
    body: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    loader: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inputContainer: {
        flex: 1,
    },
});

const RIGHT_BUTTON = buildNavigationButton('edit-post', 'edit_post.save.button');

type EditPostProps = {
    componentId: AvailableScreens;
    closeButtonId: string;
    post: PostModel;
    maxPostSize: number;
    hasFilesAttached: boolean;
    canDelete: boolean;
    files?: FileInfo[];
}
const EditPost = ({componentId, maxPostSize, post, closeButtonId, hasFilesAttached, canDelete, files}: EditPostProps) => {
    const editingMessage = post.messageSource || post.message;
    const [postMessage, setPostMessage] = useState(editingMessage);
    const [cursorPosition, setCursorPosition] = useState(editingMessage.length);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [isUpdating, setIsUpdating] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);
    const [propagateValue, shouldProcessEvent] = useInputPropagation();
    const [postFiles, setPostFiles] = useState<FileInfo[]>(files || []);

    const mainView = useRef<View>(null);

    const postInputRef = useRef<PasteInputRef | undefined>(undefined);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const shouldDeleteOnSave = !postMessage && canDelete && !hasFilesAttached;

    useEffect(() => {
        toggleSaveButton(false);
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            postInputRef.current?.focus();
        }, 320);

        return () => {
            clearTimeout(t);
        };
    }, []);

    useDidUpdate(() => {
        // Workaround to avoid iOS emdash autocorrect in Code Blocks
        if (Platform.OS === 'ios') {
            onTextSelectionChange();
        }
    }, [postMessage]);

    const onClose = useCallback(() => {
        Keyboard.dismiss();
        dismissModal({componentId});
    }, [componentId]);

    const onTextSelectionChange = useCallback((curPos: number = cursorPosition) => {
        setCursorPosition(curPos);
    }, [cursorPosition]);

    const toggleSaveButton = useCallback((enabled = true) => {
        setButtons(componentId, {
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                disabledColor: changeOpacity(theme.sidebarHeaderTextColor, 0.32),
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    }, [componentId, intl, theme]);

    const handleFileRemoval = useCallback((id: string) => {
        const filterFileById = (file: FileInfo) => {
            return file.id !== id;
        };
        Alert.alert(
            intl.formatMessage({
                id: 'edit_post.delete_file.title',
                defaultMessage: 'Delete attachment',
            }),
            intl.formatMessage({
                id: 'edit_post.delete_file.confirmation',
                defaultMessage: 'Are you sure you want to remove {filename}?',
            }, {
                filename: postFiles?.find((file) => file.id === id)?.name || '',
            }),
            [
                {
                    text: intl.formatMessage({
                        id: 'edit_post.delete_file.cancel',
                        defaultMessage: 'Cancel',
                    }),
                    style: 'cancel',
                },
                {
                    text: intl.formatMessage({
                        id: 'edit_post.delete_file.confirm',
                        defaultMessage: 'Delete',
                    }),
                    style: 'destructive',
                    onPress: () => {
                        setPostFiles((prevFiles) => prevFiles?.filter(filterFileById) || []);
                        toggleSaveButton(true);
                    },
                },
            ],
        );
    }, [intl, toggleSaveButton, postFiles]);

    const onChangeTextCommon = useCallback((message: string) => {
        const tooLong = message.trim().length > maxPostSize;
        setErrorLine(undefined);
        setErrorExtra(undefined);
        if (tooLong) {
            const line = intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'});
            const extra = `${message.trim().length} / ${maxPostSize}`;
            setErrorLine(line);
            setErrorExtra(extra);
        }
        toggleSaveButton(editingMessage !== message && !tooLong);
    }, [intl, maxPostSize, editingMessage, toggleSaveButton]);

    const onAutocompleteChangeText = useCallback((message: string) => {
        setPostMessage(message);
        propagateValue(message);
        onChangeTextCommon(message);
    }, [onChangeTextCommon, propagateValue]);

    const onInputChangeText = useCallback((message: string) => {
        if (!shouldProcessEvent(message)) {
            return;
        }
        setPostMessage(message);
        onChangeTextCommon(message);
    }, [onChangeTextCommon, shouldProcessEvent]);

    const handleUIUpdates = useCallback((res: {error?: unknown}) => {
        if (res.error) {
            setIsUpdating(false);
            const errorMessage = intl.formatMessage({id: 'mobile.edit_post.error', defaultMessage: 'There was a problem editing this message. Please try again.'});
            setErrorLine(errorMessage);
            postInputRef?.current?.focus();
        } else {
            setIsUpdating(false);
            onClose();
        }
    }, [intl, onClose]);

    const handleDeletePost = useCallback(async () => {
        Alert.alert(
            intl.formatMessage({id: 'mobile.edit_post.delete_title', defaultMessage: 'Confirm Post Delete'}),
            intl.formatMessage({
                id: 'mobile.edit_post.delete_question',
                defaultMessage: 'Are you sure you want to delete this Post?',
            }),
            [{
                text: intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
                onPress: () => {
                    setIsUpdating(false);
                    toggleSaveButton();
                    setPostMessage(editingMessage);
                },
            }, {
                text: intl.formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: async () => {
                    const res = await deletePost(serverUrl, post);
                    handleUIUpdates(res);
                },
            }],
        );
    }, [intl, toggleSaveButton, editingMessage, serverUrl, post, handleUIUpdates]);

    const onSavePostMessage = useCallback(async () => {
        setIsUpdating(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);
        toggleSaveButton(false);
        if (shouldDeleteOnSave) {
            handleDeletePost();
            return;
        }

        const currentFileIds = postFiles.map((file) => file.id).filter((id): id is string => Boolean(id));
        const originalFiles = post.metadata?.files || [];
        const originalFileIds = originalFiles.map((file) => file.id).filter((id): id is string => Boolean(id));
        const currentFileIdSet = new Set(currentFileIds);
        const removedFileIds = originalFileIds.filter((id) => !currentFileIdSet.has(id));

        const res = await editPost(serverUrl, post.id, postMessage, currentFileIds, removedFileIds);
        handleUIUpdates(res);
    }, [toggleSaveButton, shouldDeleteOnSave, post.metadata?.files, post.id, serverUrl, postMessage, handleUIUpdates, handleDeletePost, postFiles]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    useNavButtonPressed(RIGHT_BUTTON.id, componentId, onSavePostMessage, [postMessage, postFiles]);
    useNavButtonPressed(closeButtonId, componentId, onClose, []);
    useAndroidHardwareBackHandler(componentId, onClose);

    const overlap = useKeyboardOverlap(mainView, containerHeight);
    const autocompletePosition = overlap + AUTOCOMPLETE_SEPARATION;
    const autocompleteAvailableSpace = containerHeight - autocompletePosition;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

    if (isUpdating) {
        return (
            <View
                style={styles.loader}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <Loading color={theme.buttonBg}/>
            </View>
        );
    }

    return (
        <EditPostProvider onFileRemove={handleFileRemoval}>
            <SafeAreaView
                testID='edit_post.screen'
                style={styles.container}
                onLayout={onLayout}
                nativeID={SecurityManager.getShieldScreenId(componentId)}
            >
                <ExtraKeyboardProvider>
                    <View
                        style={styles.body}
                        ref={mainView}
                    >
                        {Boolean((errorLine || errorExtra)) &&
                            <PostError
                                errorExtra={errorExtra}
                                errorLine={errorLine}
                            />
                        }
                        <View style={styles.inputContainer}>
                            <EditPostInput
                                hasError={Boolean(errorLine)}
                                message={postMessage}
                                onChangeText={onInputChangeText}
                                onTextSelectionChange={onTextSelectionChange}
                                inputRef={postInputRef}
                                post={post}
                                postFiles={postFiles}
                            />
                        </View>
                    </View>
                </ExtraKeyboardProvider>
            </SafeAreaView>
            <Autocomplete
                channelId={post.channelId}
                hasFilesAttached={hasFilesAttached}
                nestedScrollEnabled={true}
                rootId={post.rootId}
                updateValue={onAutocompleteChangeText}
                value={postMessage}
                cursorPosition={cursorPosition}
                position={animatedAutocompletePosition}
                availableSpace={animatedAutocompleteAvailableSpace}
                inPost={false}
                serverUrl={serverUrl}
            />
        </EditPostProvider>
    );
};

export default EditPost;
