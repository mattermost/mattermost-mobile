// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardType, Platform, SafeAreaView, View} from 'react-native';

import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
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

// const LEFT_BUTTON = {
//     id: 'close-edit-post',
//     testID: 'close.edit_post.button',
// };
//
// const RIGHT_BUTTON = {
//     id: 'edit-post',
//     showAsAction: 'always',
//     testID: 'edit_post.save.button',
// };

type EditPostProps = {
    post: PostModel;
    maxPostSize: number;
}

//todo: Call api to editPost
const EditPost = ({maxPostSize, post}: EditPostProps) => {
    const [keyboardType, setKeyboardType] = useState<KeyboardType>('default');
    const [postMessage, setPostMessage] = useState(post.message);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [errorLine, setErrorLine] = useState<string | undefined>();
    const [errorExtra, setErrorExtra] = useState<string | undefined>();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const onPostSelectionChange = useCallback((curPos: number = cursorPosition) => {
        // const cpos = fromOnPostChangeText ? cursorPosition : event!.nativeEvent.selection.end;
        if (Platform.OS === 'ios') {
            setKeyboardType(switchKeyboardForCodeBlocks(postMessage, curPos));
        }
        setCursorPosition(curPos);
    }, [cursorPosition, postMessage]);

    useDidUpdate(() => {
        // Workaround to avoid iOS emdash autocorrect in Code Blocks
        if (Platform.OS === 'ios') {
            onPostSelectionChange();
        }
    }, [postMessage]);

    const onPostChangeText = (message: string) => {
        setPostMessage(message);
        const tooLong = message.trim().length > maxPostSize;
        const line = tooLong ? intl.formatMessage({id: 'mobile.message_length.message_split_left', defaultMessage: 'Message exceeds the character limit'}) : undefined;
        const extra = tooLong ? `${message.trim().length} / ${maxPostSize}` : undefined;
        setErrorLine(line);
        setErrorExtra(extra);

        if (message) {
            //todo:
            // this.emitCanEditPost(!tooLong);
        } else {
            //todo:
            // this.emitCanEditPost(false);
        }
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
