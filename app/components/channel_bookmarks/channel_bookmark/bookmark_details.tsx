// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {View, Text} from 'react-native';
import FastImage from 'react-native-fast-image';

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
    row: {flexDirection: 'row'},
    imageContainer: {width: 24, height: 24},
    image: {width: 20, height: 20, top: 2},
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 100, 'SemiBold'),
        marginLeft: 3,
    },
    emoji: {alignSelf: 'center'},
}));

const BookmarkDetails = ({bookmark, children, file}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

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
                    size={20}
                    textStyle={styles.emoji}
                />
                }
                {children}
            </View>
            <Text style={styles.text}>{bookmark.displayName}</Text>
        </View>
    );
};

export default BookmarkDetails;
