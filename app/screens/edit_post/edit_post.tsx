// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Keyboard, type LayoutChangeEvent, Platform, View, StyleSheet} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {deletePost, editPost} from '@actions/remote/post';
import Autocomplete from '@components/autocomplete';
import Loading from '@components/loading';
import {QUICK_ACTIONS_HEIGHT} from '@components/post_draft/quick_actions/quick_actions';
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
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import SecurityManager from '@managers/security_manager';
import PostError from '@screens/edit_post/post_error';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {fileMaxWarning, fileSizeWarning, uploadDisabledWarning} from '@utils/file';
import {changeOpacity} from '@utils/theme';

import EditPostInput from './edit_post_input';

import type {PasteInputRef} from '@mattermost/react-native-paste-input';
import type {ErrorHandlers} from '@typings/components/upload_error_handlers';
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

// Exclude bottom edge from SafeAreaView to prevent gap between attachments and keyboard.
const safeAreaEdges: Edge[] = ['top', 'left', 'right'];

type EditPostProps = {
    componentId: AvailableScreens;
    closeButtonId: string;
    post: PostModel;
    maxPostSize: number;
    canDelete: boolean;
    files?: FileInfo[];
    maxFileCount: number;
    maxFileSize: number;
    canUploadFiles: boolean;
}

const EditPost = ({
    componentId,
    maxPostSize,
    post,
    closeButtonId,
    canDelete,
    files,
    maxFileCount,
    maxFileSize,
    canUploadFiles,
}: EditPostProps) => {
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
    const uploadErrorHandlers = useRef<ErrorHandlers>({});

    const postInputRef = useRef<PasteInputRef | undefined>(undefined);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const hasNoCurrentFiles = postFiles.length === 0;
    const shouldDeleteOnSave = !postMessage && canDelete && hasNoCurrentFiles;

    const shouldEnableSaveButton = useCallback(() => {
        const loadingFiles = postFiles.filter((v) => v.clientId && DraftEditPostUploadManager.isUploading(v.clientId));
        const hasUploadingFiles = loadingFiles.length > 0;
        const tooLong = postMessage.length > maxPostSize;

        const messageChanged = editingMessage !== postMessage;

        const originalFiles = files || [];
        const originalFileIds = originalFiles.map((f) => f.id).sort();
        const currentFileIds = postFiles.map((f) => f.id).filter((id) => id).sort();
        const filesChanged = JSON.stringify(originalFileIds) !== JSON.stringify(currentFileIds);

        // Enable save button if:
        // 1. No files are uploading AND
        // 2. No message length error AND
        // 3. (Message changed OR files changed)
        return !hasUploadingFiles && !tooLong && (messageChanged || filesChanged);
    }, [postMessage, postFiles, editingMessage, maxPostSize, files]);

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

    const updateFileInPostFiles = useCallback((updatedFile: FileInfo) => {
        const hasSameClientId = (file: FileInfo) => {
            return file.clientId === updatedFile.clientId;
        };

        setPostFiles((prevFiles) => {
            const fileIndex = prevFiles.findIndex(hasSameClientId);
            if (fileIndex >= 0) {
                const newFiles = [...prevFiles];
                newFiles[fileIndex] = updatedFile;
                return newFiles;
            }
            return prevFiles;
        });
    }, []);

    const addFiles = useCallback((newFiles: FileInfo[]) => {
        if (!newFiles.length) {
            return;
        }

        if (!canUploadFiles) {
            setErrorLine(uploadDisabledWarning(intl));
            return;
        }

        const currentFileCount = postFiles?.length || 0;
        const availableCount = maxFileCount - currentFileCount;
        if (newFiles.length > availableCount) {
            setErrorLine(fileMaxWarning(intl, maxFileCount));
            return;
        }

        const largeFile = newFiles.find((file) => file.size > maxFileSize);
        if (largeFile) {
            setErrorLine(fileSizeWarning(intl, maxFileSize));
            return;
        }

        setPostFiles((prevFiles) => [...prevFiles, ...newFiles]);

        // Start uploads for new files using the upload manager
        for (const file of newFiles) {
            DraftEditPostUploadManager.prepareUpload(
                serverUrl,
                file,
                post.channelId,
                post.rootId,
                0,
                true, // isEditPost = true
                updateFileInPostFiles,
            );
            uploadErrorHandlers.current[file.clientId!] = DraftEditPostUploadManager.registerErrorHandler(file.clientId!, setErrorLine);
        }

        const currentMessageTooLong = postMessage.length > maxPostSize;
        if (!currentMessageTooLong) {
            setErrorLine(undefined);
        }
    }, [canUploadFiles, postFiles?.length, maxFileCount, setErrorLine, intl, maxFileSize, serverUrl, post.channelId, post.rootId, updateFileInPostFiles, postMessage, maxPostSize]);

    const handleFileRemoval = useCallback((id: string) => {

        const fileToRemove = postFiles?.find((file) => {
            if (file.id && id) {
                return file.id === id;
            }
            if (file.clientId && id) {
                return file.clientId === id;
            }
            return false;
        });

        if (!fileToRemove) {
            return;
        }

        const shouldKeepFile = (file: FileInfo) => {
            if (fileToRemove.id && file.id) {
                return file.id !== fileToRemove.id;
            }
            if (fileToRemove.clientId && file.clientId) {
                return file.clientId !== fileToRemove.clientId;
            }
            return file !== fileToRemove;
        };

        const removeFileAction = () => {
            if (fileToRemove.clientId && DraftEditPostUploadManager.isUploading(fileToRemove.clientId)) {
                DraftEditPostUploadManager.cancel(fileToRemove.clientId);
                if (uploadErrorHandlers.current[fileToRemove.clientId]) {
                    uploadErrorHandlers.current[fileToRemove.clientId]?.();
                    delete uploadErrorHandlers.current[fileToRemove.clientId];
                }
            }

            // Remove the specific file by using a unique identifier combination
            setPostFiles((prevFiles) => prevFiles?.filter(shouldKeepFile) || []);
        };

        const originalFiles = files || [];
        const isNewlyUploadedFile = !originalFiles.some((originalFile) => {
            return originalFile.id === fileToRemove.id;
        });

        if (isNewlyUploadedFile) {
            removeFileAction();
        } else {
            Alert.alert(
                intl.formatMessage({
                    id: 'edit_post.delete_file.title',
                    defaultMessage: 'Delete attachment',
                }),
                intl.formatMessage({
                    id: 'edit_post.delete_file.confirmation',
                    defaultMessage: 'Are you sure you want to remove {filename}?',
                }, {
                    filename: fileToRemove.name || '',
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
                        onPress: removeFileAction,
                    },
                ],
            );
        }
    }, [intl, postFiles, files]);

    useEffect(() => {
        let loadingFiles: FileInfo[] = [];
        if (postFiles) {
            loadingFiles = postFiles.filter((v) => v.clientId && DraftEditPostUploadManager.isUploading(v.clientId));
        }

        toggleSaveButton(shouldEnableSaveButton());

        for (const key of Object.keys(uploadErrorHandlers.current)) {
            if (!loadingFiles.find((v) => v.clientId === key)) {
                uploadErrorHandlers.current[key]?.();
                delete uploadErrorHandlers.current[key];
            }
        }

        for (const file of loadingFiles) {
            if (file.clientId && !uploadErrorHandlers.current[file.clientId]) {
                uploadErrorHandlers.current[file.clientId] = DraftEditPostUploadManager.registerErrorHandler(file.clientId, setErrorLine);
            }
        }
    }, [postFiles, postMessage, setErrorLine, shouldEnableSaveButton, toggleSaveButton]);

    const onChangeTextCommon = useCallback((message: string) => {
        const tooLong = message.length > maxPostSize;
        setErrorExtra(undefined);

        if (tooLong) {
            const line = intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'});
            const extra = `${message.length} / ${maxPostSize}`;
            setErrorLine(line);
            setErrorExtra(extra);
        } else {
            // Clear any error when message is valid
            setErrorLine(undefined);
        }
    }, [intl, maxPostSize]);

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
    const autocompletePosition = overlap + AUTOCOMPLETE_SEPARATION + QUICK_ACTIONS_HEIGHT;
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
        <EditPostProvider
            onFileRemove={handleFileRemoval}
            updateFileCallback={updateFileInPostFiles}
            isEditMode={true}
        >
            <SafeAreaView
                testID='edit_post.screen'
                style={styles.container}
                edges={safeAreaEdges}
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
                                hasError={Boolean(errorLine || errorExtra)}
                                message={postMessage}
                                onChangeText={onInputChangeText}
                                onTextSelectionChange={onTextSelectionChange}
                                inputRef={postInputRef}
                                post={post}
                                postFiles={postFiles}
                                addFiles={addFiles}
                            />
                        </View>
                    </View>
                </ExtraKeyboardProvider>
            </SafeAreaView>
            <Autocomplete
                channelId={post.channelId}
                shouldDirectlyReact={false}
                nestedScrollEnabled={true}
                rootId={post.rootId}
                updateValue={onAutocompleteChangeText}
                value={postMessage}
                cursorPosition={cursorPosition}
                position={animatedAutocompletePosition}
                availableSpace={animatedAutocompleteAvailableSpace}
                serverUrl={serverUrl}
            />
        </EditPostProvider>
    );
};

export default EditPost;
