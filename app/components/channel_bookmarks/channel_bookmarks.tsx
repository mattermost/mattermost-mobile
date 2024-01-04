// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {FlatList, View} from 'react-native';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddBookmark from './add_bookmark';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

type Props = {
    bookmarks: ChannelBookmarkModel[];
    canAddBookmarks: boolean;
    canUploadFiles: boolean;
    channelId: string;
    currentUserId: string;
    showButtonWhenEmpty: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginTop: 8,
        marginBottom: 24,
    },
}));

const ChannelBookmarks = ({
    bookmarks, canAddBookmarks, canUploadFiles,
    channelId, currentUserId, showButtonWhenEmpty,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    if (!bookmarks.length && showButtonWhenEmpty && canAddBookmarks) {
        return (
            <AddBookmark
                canUploadFiles={canUploadFiles}
                channelId={channelId}
                currentUserId={currentUserId}
                showLarge={true}
                showInInfo={true}
            />
        );
    }

    return (
        <>
            <FlatList
                data={bookmarks}
                horizontal={true}
                ListFooterComponent={(
                    <AddBookmark
                        canUploadFiles={canUploadFiles}
                        channelId={channelId}
                        currentUserId={currentUserId}
                        showLarge={false}
                        showInInfo={showButtonWhenEmpty}
                    />
                )}
                renderItem={() => null}
            />
            <View style={styles.separator}/>
        </>
    );

    // return null;
};

export default ChannelBookmarks;
