// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, type ReactNode} from 'react';
import {View, Text, Platform} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import BookmarkIcon from './bookmark_icon';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type FileModel from '@typings/database/models/servers/file';

type Props = {
    bookmark: ChannelBookmarkModel;
    children?: ReactNode;
    file?: FileModel;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
    },
    image: {
        width: 20,
        height: 20,
    },
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
        marginLeft: 2,
    },
    emoji: {
        alignSelf: 'center',
        top: Platform.select({android: -2}),
    },
    genericBookmark: {
        top: 1,
    },
}));

const BookmarkDetails = ({bookmark, children, file}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const fileInfo = useMemo(() => file?.toFileInfo(bookmark.ownerId), [file, bookmark.ownerId]);

    return (
        <View style={styles.row}>
            <View style={styles.imageContainer}>
                <BookmarkIcon
                    emoji={bookmark.emoji}
                    emojiSize={Platform.select({ios: 20, default: 19})}
                    emojiStyle={styles.emoji}
                    file={fileInfo}
                    genericStyle={styles.genericBookmark}
                    iconSize={24}
                    imageStyle={styles.image}
                    imageUrl={bookmark.imageUrl}
                />
                {children}
            </View>
            <Text style={styles.text}>{bookmark.displayName}</Text>
        </View>
    );
};

export default BookmarkDetails;
