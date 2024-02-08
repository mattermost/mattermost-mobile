// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Keyboard, type LayoutChangeEvent, Platform, SafeAreaView, View, StyleSheet} from 'react-native';

import {deletePost, editPost} from '@actions/remote/post';
import Autocomplete from '@components/autocomplete';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useKeyboardOverlap} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useInputPropagation} from '@hooks/input';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import PostError from '@screens/edit_post/post_error';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

import EditPostInput, {type EditPostInputRef} from './edit_post_input';

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
});

const RIGHT_BUTTON = buildNavigationButton('edit-post', 'edit_post.save.button');

type EditPostProps = {
    componentId: AvailableScreens;
    closeButtonId: string;
    post: PostModel;
    maxPostSize: number;
    hasFilesAttached: boolean;
    canDelete: boolean;
}
const EditPost = ({componentId, maxPostSize, post, closeButtonId, hasFilesAttached, canDelete}: EditPostProps) => {
    const editingMessage = post.messageSource || post.message;
    const [postMessage, setPostMessage] = useState(editingMessage);
    const [cursorPosition, setCursorPosition] = useState(editingMessage.length);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [isUpdating, setIsUpdating] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);
    const [propagateValue, shouldProcessEvent] = useInputPropagation();

    const mainView = useRef<View>(null);

    const postInputRef = useRef<EditPostInputRef>(null);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

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
    }, []);

    const onTextSelectionChange = useCallback((curPos: number = cursorPosition) => {
        setCursorPosition(curPos);
    }, [cursorPosition, postMessage]);

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
    }, [onChangeTextCommon]);

    const onInputChangeText = useCallback((message: string) => {
        if (!shouldProcessEvent(message)) {
            return;
        }
        setPostMessage(message);
        onChangeTextCommon(message);
    }, [onChangeTextCommon]);

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
    }, []);

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
    }, [serverUrl, editingMessage]);

    const onSavePostMessage = useCallback(async () => {
        setIsUpdating(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);
        toggleSaveButton(false);
        if (!postMessage && canDelete && !hasFilesAttached) {
            handleDeletePost();
            return;
        }

        const res = await editPost(serverUrl, post.id, postMessage);
        handleUIUpdates(res);
    }, [toggleSaveButton, serverUrl, post.id, postMessage, onClose]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    useNavButtonPressed(RIGHT_BUTTON.id, componentId, onSavePostMessage, [postMessage]);
    useNavButtonPressed(closeButtonId, componentId, onClose, []);
    useAndroidHardwareBackHandler(componentId, onClose);

    const overlap = useKeyboardOverlap(mainView, containerHeight);
    const autocompletePosition = overlap + AUTOCOMPLETE_SEPARATION;
    const autocompleteAvailableSpace = containerHeight - autocompletePosition;

    const inputHeight = containerHeight - overlap;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

    if (isUpdating) {
        return (
            <View style={styles.loader}>
                <Loading color={theme.buttonBg}/>
            </View>
        );
    }

    return (
        <>
            <SafeAreaView
                testID='edit_post.screen'
                style={styles.container}
                onLayout={onLayout}
            >
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
                    <EditPostInput
                        inputHeight={inputHeight}
                        hasError={Boolean(errorLine)}
                        message={postMessage}
                        onChangeText={onInputChangeText}
                        onTextSelectionChange={onTextSelectionChange}
                        ref={postInputRef}
                    />
                </View>
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
        </>
    );
};

export default EditPost;
