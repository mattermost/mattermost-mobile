// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {blendColors, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        replyBar: {
            backgroundColor: blendColors(theme.centerChannelBg, theme.centerChannelColor, 0.1),
            marginLeft: 1,
            marginRight: 7,
            width: 3,
            flexBasis: 3,
        },
        replyBarFirst: {paddingTop: 10},
        replyBarLast: {paddingBottom: 10},
        replyMention: {backgroundColor: theme.mentionHighlightBg},
    };
});

type Props = {
    highlight: boolean;
    isFirstReply?: boolean;
    isLastReply?: boolean;
};

/**
 * Vertical bar shown to the left of a reply's body when collapsed reply threads
 * are disabled, visually linking the replies of a thread in the channel.
 * The parent decides whether the post is a reply; this only draws the bar and
 * must be rendered inside a row container alongside the post body.
 */
const ReplyBar = ({highlight, isFirstReply, isLastReply}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View
            style={[
                style.replyBar,
                isFirstReply && style.replyBarFirst,
                isLastReply && style.replyBarLast,
                highlight && style.replyMention,
            ]}
            testID='post.reply_bar'
        />
    );
};

export default ReplyBar;
