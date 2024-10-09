// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@app/utils/markdown';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import Markdown from '@components/markdown';

import type {DraftModel} from '@app/database/models/server';
import type {UserMentionKey} from '@typings/global/markdown';

type Props = {
    draft: DraftModel;
    layoutWidth: number;
    location: string;
}

const EMPTY_MENTION_KEYS: UserMentionKey[] = [];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageContainer: {
            width: '100%',
        },
        reply: {
            paddingRight: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        pendingPost: {
            opacity: 0.5,
        },
    };
});

const DraftMessage: React.FC<Props> = ({
    draft,
    layoutWidth,
    location,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    return (
        <View>
            <Markdown
                baseTextStyle={style.message}
                blockStyles={blockStyles}
                channelId={draft.channelId}
                layoutWidth={layoutWidth}
                location={location}
                postId={draft.id}
                textStyles={textStyles}
                value={draft.message}
                mentionKeys={EMPTY_MENTION_KEYS}
                theme={theme}
            />
        </View>
    );
};

export default DraftMessage;
