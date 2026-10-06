// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {blendColors, makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    highlight: boolean;
    isCRTEnabled?: boolean;
    isFirstReply?: boolean;
    isLastReply?: boolean;
    isReplyPost: boolean;
    location: AvailableScreens;
};

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
        replyMention: {
            backgroundColor: theme.mentionHighlightBg,
            opacity: 1,
        },
    };
});

/**
 * Vertical bar shown to the left of a reply's body when collapsed reply threads
 * are disabled, visually linking the replies of a thread in the channel.
 * Must be rendered inside a row container alongside the post body.
 */
const ReplyBar = ({highlight, isCRTEnabled, isFirstReply, isLastReply, isReplyPost, location}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    if (!isReplyPost || (isCRTEnabled && location === Screens.PERMALINK)) {
        return null;
    }

    const barStyle: StyleProp<ViewStyle> = [
        style.replyBar,
        isFirstReply && style.replyBarFirst,
        isLastReply && style.replyBarLast,
        highlight && style.replyMention,
    ];

    return (
        <View
            style={barStyle}
            testID='post.reply_bar'
        />
    );
};

export default ReplyBar;
