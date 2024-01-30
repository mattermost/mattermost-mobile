// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {View, Text, Platform} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import FileIcon from '@components/files/file_icon';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

    let generic;
    if (!bookmark.imageUrl && !bookmark.emoji && !file) {
        generic = (
            <CompassIcon
                name='book-outline'
                size={22}
                color={theme.centerChannelColor}
                style={styles.genericBookmark}
            />
        );
    }

    return (
        <View style={styles.row}>
            <View style={styles.imageContainer}>
                {Boolean(file) && !bookmark.emoji &&
                <FileIcon
                    file={file?.toFileInfo(bookmark.ownerId)}
                    iconSize={24}
                    smallImage={true}
                />
                }
                {Boolean(bookmark.imageUrl) && !bookmark.emoji &&
                <FastImage
                    source={{uri: bookmark.imageUrl}}
                    style={styles.image}
                />
                }
                {Boolean(bookmark.emoji) &&
                <Emoji
                    emojiName={bookmark.emoji!}
                    size={Platform.select({ios: 20, default: 19})}
                    textStyle={styles.emoji}
                />
                }
                {generic}
                {children}
            </View>
            <Text style={styles.text}>{bookmark.displayName}</Text>
        </View>
    );
};

export default BookmarkDetails;
