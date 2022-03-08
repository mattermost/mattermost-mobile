// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Keyboard, KeyboardType, Platform, SafeAreaView, useWindowDimensions, View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';
import {Navigation} from 'react-native-navigation';

import {deletePost, editPost} from '@actions/remote/post';
import AutoComplete from '@components/autocomplete';
import Loading from '@components/loading';
import {LIST_BOTTOM, OFFSET_TABLET} from '@constants/autocomplete';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import PostError from '@screens/edit_post/post_error';
import {dismissModal, setButtons} from '@screens/navigation';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EditPostInput, {PostInputRef} from './edit_post_input';

import type PostModel from '@typings/database/models/servers/post';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        autocomplete: {
            position: undefined,
        },
        container: {
            flex: 1,
        },
        loader: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        body: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        autocompleteContainer: {
            flex: 1,
            justifyContent: 'flex-end',
        },
    };
});

const LEFT_BUTTON = {
    id: 'close-edit-post',
    testID: 'close.edit_post.button',
};
const RIGHT_BUTTON = {
    id: 'edit-post',
    testID: 'edit_post.save.button',
    showAsAction: 'always' as const,
};

type EditPostProps = {
    componentId: string;
    closeButton: string;
    post: PostModel;
    maxPostSize: number;
    hasFilesAttached: boolean;
    canDelete: boolean;
}
const EditPost = ({componentId, maxPostSize, post, closeButton, hasFilesAttached, canDelete}: EditPostProps) => {
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('default');
    const [postMessage, setPostMessage] = useState(post.message);
    const [cursorPosition, setCursorPosition] = useState(post.message.length);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [isUpdating, setIsUpdating] = useState(false);

    const postInputRef = useRef<PostInputRef>(null);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const {width, height} = useWindowDimensions();
    const isLandscape = width > height;
    const styles = getStyleSheet(theme);

    const postInputTop = useMemo(() => {
        if (isTablet) {
            return isLandscape ? -OFFSET_TABLET : (-OFFSET_TABLET * 4);
        }
        return Platform.select({
            ios: -LIST_BOTTOM + 3,
            default: 10,
        });
    }, [isLandscape]);

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [{
                ...LEFT_BUTTON,
                icon: closeButton,
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                ...RIGHT_BUTTON,
                enabled: false,
            }],
        });
    }, [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case LEFT_BUTTON.id: {
                        onClose();
                        break;
                    }
                    case RIGHT_BUTTON.id:
                        onSavePostMessage();
                        break;
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, [postMessage]);

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
        if (Platform.OS === 'ios') {
            setKeyboardType(switchKeyboardForCodeBlocks(postMessage, curPos));
        }
        setCursorPosition(curPos);
    }, [cursorPosition, postMessage]);

    const toggleSaveButton = useCallback((enabled = true) => {
        setButtons(componentId, {
            leftButtons: [{
                ...LEFT_BUTTON,
                icon: closeButton,
            }],
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                enabled,
            }],
        });
    }, [componentId, theme]);

    const onChangeText = useCallback((message: string) => {
        setPostMessage(message);
        const tooLong = message.trim().length > maxPostSize;

        if (tooLong) {
            const line = tooLong ? intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'}) : undefined;
            const extra = tooLong ? `${message.trim().length} / ${maxPostSize}` : undefined;
            setErrorLine(line);
            setErrorExtra(extra);
        }
        toggleSaveButton();
    }, [intl, maxPostSize, toggleSaveButton]);

    const handleUIUpdates = useCallback((res) => {
        if (res?.error) {
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
        let res;
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
                    setPostMessage(post.message);
                },
            }, {
                text: intl.formatMessage({id: 'post_info.del', defaultMessage: 'Delete'}),
                style: 'destructive',
                onPress: async () => {
                    res = await deletePost(serverUrl, post.id);
                    handleUIUpdates(res);
                },
            }],
        );

        return res;
    }, [serverUrl, post.message]);

    const onSavePostMessage = useCallback(async () => {
        setIsUpdating(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);
        toggleSaveButton(true);
        if (!postMessage && canDelete && !hasFilesAttached) {
            return handleDeletePost();
        }

        const res = await editPost(serverUrl, post.id, postMessage);
        return handleUIUpdates(res);
    }, [toggleSaveButton, serverUrl, post.id, postMessage, onClose]);

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
            >
                <View style={styles.body}>
                    { (errorLine || errorExtra) && (
                        <PostError
                            errorExtra={errorExtra}
                            errorLine={errorLine}
                        />
                    ) }
                    {postMessage &&
                        <EditPostInput
                            hasError={Boolean(errorLine)}
                            keyboardType={keyboardType}
                            message={postMessage}
                            onChangeText={onChangeText}
                            onTextSelectionChange={onTextSelectionChange}
                            ref={postInputRef}
                        />
                    }
                </View>
            </SafeAreaView>
            <KeyboardTrackingView
                style={styles.autocompleteContainer}
            >
                <AutoComplete
                    channelId={post.channelId}
                    hasFilesAttached={hasFilesAttached}
                    nestedScrollEnabled={true}
                    rootId={post.rootId}
                    updateValue={onChangeText}
                    value={postMessage}
                    cursorPosition={cursorPosition}
                    postInputTop={postInputTop}
                />
            </KeyboardTrackingView>

        </>
    );
};

export default EditPost;
