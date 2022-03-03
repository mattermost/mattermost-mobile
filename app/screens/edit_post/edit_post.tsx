// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, KeyboardType, Platform, SafeAreaView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {deletePost, editPost} from '@actions/remote/post';
import AutoComplete from '@components/autocomplete';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import PostError from '@screens/edit_post/post_error';
import {dismissModal, setButtons} from '@screens/navigation';
import PostModel from '@typings/database/models/servers/post';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput, {PostInputRef} from './post_input';

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
        scrollView: {
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
    const [cursorPosition, setCursorPosition] = useState(0);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [rightButtonEnabled, setRightButtonEnabled] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [postInputTop, setPostInputTop] = useState(0);
    const postInputRef = useRef<PostInputRef>(null);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const styles = getStyleSheet(theme);

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
                        onSaveEditedPost();
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

    const onTextSelectionChange = useCallback((curPos: number = cursorPosition) => {
        if (Platform.OS === 'ios') {
            setKeyboardType(switchKeyboardForCodeBlocks(postMessage, curPos));
        }
        setCursorPosition(curPos);
    }, [cursorPosition, postMessage]);

    const toggleSaveButton = useCallback((message: string) => {
        //todo: might be no need for rightButtonEnabled

        // if (rightButtonEnabled !== enabled) {
        //     setRightButtonEnabled(enabled);
        setButtons(componentId, {
            leftButtons: [{
                ...LEFT_BUTTON,
                icon: closeButton,
            }],
            rightButtons: [{
                ...RIGHT_BUTTON,
                color: theme.sidebarHeaderTextColor,
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                enabled: true,
            }],
        });

        // }
    }, [rightButtonEnabled, componentId]);

    const onChangeText = useCallback((message: string) => {
        setPostMessage(message);
        const tooLong = message.trim().length > maxPostSize;

        if (tooLong) {
            const line = tooLong ? intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'}) : undefined;
            const extra = tooLong ? `${message.trim().length} / ${maxPostSize}` : undefined;
            setErrorLine(line);
            setErrorExtra(extra);
        }
        toggleSaveButton(message);
    }, [intl, maxPostSize, toggleSaveButton]);

    const emitEditing = useCallback((loading) => {
        setRightButtonEnabled(!loading);
        setButtons(componentId, {
            leftButtons: [{
                ...LEFT_BUTTON,
                icon: closeButton,
            }],
            rightButtons: [{...RIGHT_BUTTON, enabled: !loading}],
        });
    }, []);

    const onClose = useCallback(() => {
        Keyboard.dismiss();
        dismissModal({componentId});
    }, []);

    const onSaveEditedPost = useCallback(async () => {
        setIsUpdating(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);

        emitEditing(true);
        const shouldDeletePost = !postMessage && canDelete && !hasFilesAttached;

        const getRequest = async (url: string, postId: string, msg: string) => {
            if (shouldDeletePost) {
                return deletePost(url, post.id);
            }
            return editPost(url, postId, msg);
        };

        const res = await getRequest(serverUrl, post.id, postMessage);
        emitEditing(false);

        if (res?.error) {
            setIsUpdating(false);
            setErrorLine((res.error as ClientErrorProps).message);
            postInputRef?.current?.focus();
        } else {
            setIsUpdating(false);
            onClose();
        }
    }, [emitEditing, serverUrl, post.id, postMessage, onClose]);

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
                <View style={styles.scrollView}>
                    { (errorLine || errorExtra) && (
                        <PostError
                            errorExtra={errorExtra}
                            errorLine={errorLine}
                        />
                    ) }
                    <PostInput
                        hasError={Boolean(errorLine)}
                        keyboardType={keyboardType}
                        message={postMessage}
                        onChangeText={onChangeText}
                        onTextSelectionChange={onTextSelectionChange}
                        ref={postInputRef}
                    />
                </View>
            </SafeAreaView>
            <View style={{backgroundColor: 'red'}}>
                <AutoComplete
                    channelId={post.channelId}
                    cursorPosition={cursorPosition}
                    hasFilesAttached={hasFilesAttached}
                    nestedScrollEnabled={true}
                    offsetY={8}
                    postInputTop={postInputTop}
                    rootId={post.rootId}
                    updateValue={onChangeText}
                    value={postMessage}
                />
            </View>

        </>
    );
};

export default EditPost;
