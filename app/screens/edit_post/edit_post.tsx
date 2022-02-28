// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, KeyboardType, LayoutChangeEvent, Platform, SafeAreaView, View} from 'react-native';
import {KeyboardTrackingView} from 'react-native-keyboard-tracking-view';
import {Navigation} from 'react-native-navigation';

import {editPost} from '@actions/remote/post';
import AutoComplete from '@components/autocomplete';
import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import PostError from '@screens/edit_post/post_error';
import {popTopScreen, setButtons} from '@screens/navigation';
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
    post: PostModel;
    maxPostSize: number;
}

const EditPost = ({componentId, maxPostSize, post}: EditPostProps) => {
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('default');
    const [postMessage, setPostMessage] = useState(post.message);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [rightButtonEnabled, setRightButtonEnabled] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [postInputTop, setPostInputTop] = useState(0);

    const postInputRef = useRef<PostInputRef>(null);
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const styles = getStyleSheet(theme);
    const closeButtonIcon = useMemo(() => CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [{
                icon: closeButtonIcon,
                ...LEFT_BUTTON,
            }],
            rightButtons: [{
                color: theme.sidebarHeaderTextColor,
                text: intl.formatMessage({id: 'edit_post.save', defaultMessage: 'Save'}),
                ...RIGHT_BUTTON,
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
                        onEditPost();
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
            onPostSelectionChange();
        }
    }, [postMessage]);

    const updateCanEditPostButton = useCallback((enabled) => {
        if (rightButtonEnabled !== enabled) {
            setRightButtonEnabled(enabled);
            setButtons(componentId, {
                leftButtons: [{...LEFT_BUTTON, icon: closeButtonIcon}],
                rightButtons: [{...RIGHT_BUTTON, enabled}],
            });
        }
    }, [closeButtonIcon, rightButtonEnabled]);

    const onPostSelectionChange = useCallback((curPos: number = cursorPosition) => {
        // const cpos = fromOnPostChangeText ? cursorPosition : event!.nativeEvent.selection.end;
        if (Platform.OS === 'ios') {
            setKeyboardType(switchKeyboardForCodeBlocks(postMessage, curPos));
        }
        setCursorPosition(curPos);
    }, [cursorPosition, postMessage]);

    const onPostChangeText = useCallback((message: string) => {
        setPostMessage(message);
        const tooLong = message.trim().length > maxPostSize;
        const line = tooLong ? intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'}) : undefined;
        const extra = tooLong ? `${message.trim().length} / ${maxPostSize}` : undefined;
        setErrorLine(line);
        setErrorExtra(extra);
        updateCanEditPostButton(message ? !tooLong : false);
    }, [intl, maxPostSize, updateCanEditPostButton]);

    const emitEditing = useCallback((loading) => {
        setRightButtonEnabled(!loading);
        setButtons(componentId, {
            leftButtons: [{...LEFT_BUTTON, icon: closeButtonIcon}],
            rightButtons: [{...RIGHT_BUTTON, enabled: !loading}],
        });
    }, [closeButtonIcon]);

    const onClose = useCallback(() => {
        Keyboard.dismiss();
        popTopScreen();
    }, []);

    const onEditPost = useCallback(async () => {
        setIsEditing(true);
        setErrorLine(undefined);
        setErrorExtra(undefined);

        emitEditing(true);

        const {error} = await editPost(serverUrl, post.id, postMessage);
        emitEditing(false);

        if (error) {
            setIsEditing(false);
            setErrorLine(error as string);
            postInputRef?.current?.focus();
        } else {
            setIsEditing(false);
            onClose();
        }
    }, [emitEditing, serverUrl, post.id, postMessage, onClose]);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        setPostInputTop(e.nativeEvent.layout.y);
    }, []);

    if (isEditing) {
        return (
            <View style={styles.container}>
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
                        <PostError //fixme display not good
                            errorExtra={errorExtra}
                            errorLine={errorLine}
                        />
                    ) }
                    <PostInput
                        hasError={Boolean(errorLine)}
                        keyboardType={keyboardType}
                        message={postMessage}
                        onChangeText={onPostChangeText}
                        onPostSelectionChange={onPostSelectionChange}
                        ref={postInputRef}
                    />
                </View>
            </SafeAreaView>
            <KeyboardTrackingView onLayout={handleLayout}>
                <AutoComplete
                    channelId={post.channelId}
                    cursorPosition={cursorPosition}
                    hasFilesAttached={false}
                    nestedScrollEnabled={true}
                    offsetY={8}
                    postInputTop={postInputTop}
                    rootId={post.rootId}
                    updateValue={onPostChangeText}
                    value={postMessage}
                />
            </KeyboardTrackingView>
        </>
    );
};

export default EditPost;
