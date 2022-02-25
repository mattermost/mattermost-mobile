// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, KeyboardType, Platform, SafeAreaView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import {popTopScreen, setButtons} from '@screens/navigation';
import PostModel from '@typings/database/models/servers/post';
import {switchKeyboardForCodeBlocks} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import PostInput from './post_input';

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
        errorContainer: {
            paddingHorizontal: 10,
        },
        errorContainerSplit: {
            paddingHorizontal: 15,
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        errorWrapper: {
            alignItems: 'center',
        },
        errorWrap: {
            flexShrink: 1,
            paddingRight: 20,
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

//todo: Call api to editPost
const EditPost = ({componentId, maxPostSize, post}: EditPostProps) => {
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('default');
    const [postMessage, setPostMessage] = useState(post.message);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const [rightButtonEnabled, setRightButtonEnabled] = useState<boolean>(true);

    // const [autocompleteVisible, setAutocompleteVisible] = useState<boolean>(false);

    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const closeButtonIcon = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);

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
    }, [intl, theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                switch (buttonId) {
                    case 'close-edit-post': {
                        Keyboard.dismiss();
                        popTopScreen();
                        break;
                    }
                    case 'edit-post':
                        //todo:
                        // onEditPost();
                        break;
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

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

    const onPostChangeText = (message: string) => {
        setPostMessage(message);
        const tooLong = message.trim().length > maxPostSize;
        const line = tooLong ? intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'}) : undefined;
        const extra = tooLong ? `${message.trim().length} / ${maxPostSize}` : undefined;
        setErrorLine(line);
        setErrorExtra(extra);
        updateCanEditPostButton(message ? !tooLong : false);
    };

    return (
        <>
            <SafeAreaView
                testID='edit_post.screen'
                style={styles.container}
            >
                <View style={styles.scrollView}>
                    {/*{displayError}*/}
                    <PostInput
                        hasError={Boolean(errorLine)}
                        keyboardType={keyboardType}
                        message={postMessage}
                        onChangeText={onPostChangeText}
                        onPostSelectionChange={onPostSelectionChange}
                    />
                </View>
            </SafeAreaView>
        </>
    );
};

export default EditPost;
