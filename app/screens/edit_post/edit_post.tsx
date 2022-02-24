// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {useTheme} from '@context/theme';
import PostModel from '@typings/database/models/servers/post';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        inputContainer: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
            marginTop: 2,
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            padding: 15,
            textAlignVertical: 'top',
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
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const msg = `${maxPostSize} for ${post.message}`;
    return (
        <Text>{msg}</Text>
    );
};

export default EditPost;
