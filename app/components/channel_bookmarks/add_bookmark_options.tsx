// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import BookmarkType from '@components/channel_bookmarks/bookmark_type';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type AddBookmarkOptionsProps = {
    channelId: string;
    currentUserId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    flex: {flex: 1},
    listHeader: {marginBottom: 12},
    listHeaderText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600, 'SemiBold'),
    },
}));

const AddBookmarkOptions = ({channelId, currentUserId}: AddBookmarkOptionsProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <View style={styles.listHeader}>
                <FormattedText
                    id='channel_info.add_bookmark'
                    defaultMessage={'Add a bookmark'}
                    style={styles.listHeaderText}
                />
            </View>
            <View style={styles.flex}>
                <BookmarkType
                    channelId={channelId}
                    type='link'
                    ownerId={currentUserId}
                />
                <BookmarkType
                    channelId={channelId}
                    type='file'
                    ownerId={currentUserId}
                />
            </View>
        </>
    );
};

export default AddBookmarkOptions;
