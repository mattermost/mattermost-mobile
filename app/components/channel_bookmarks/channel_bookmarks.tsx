// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {FlatList, View, type ListRenderItemInfo} from 'react-native';
import Animated from 'react-native-reanimated';

import {GalleryInit} from '@context/gallery';
import {useTheme} from '@context/theme';
import {useChannelBookmarkFiles} from '@hooks/files';
import ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import AddBookmark from './add_bookmark';
import ChannelBookmark from './channel_bookmark';

type Props = {
    bookmarks: ChannelBookmarkModel[];
    canAddBookmarks: boolean;
    canDeleteBookmarks: boolean;
    canDownloadFiles: boolean;
    canEditBookmarks: boolean;
    canUploadFiles: boolean;
    channelId: string;
    currentUserId: string;
    publicLinkEnabled: boolean;
    showInInfo: boolean;
    separator?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginTop: 8,
        marginBottom: 24,
    },
    emptyItemSeparator: {
        width: 12,
    },
    addContainer: {
        marginLeft: 4,
        width: 40,
        alignContent: 'center',
        top: -2,
    },
}));

const ChannelBookmarks = ({
    bookmarks, canAddBookmarks, canDeleteBookmarks, canDownloadFiles, canEditBookmarks, canUploadFiles,
    channelId, currentUserId, publicLinkEnabled, showInInfo, separator = true,
}: Props) => {
    const galleryIdentifier = `${channelId}-bookmarks`;

    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const files = useChannelBookmarkFiles(bookmarks, publicLinkEnabled);

    const attachmentIndex = useCallback((fileId: string) => {
        return files.findIndex((file) => file.id === fileId) || 0;
    }, [files]);

    const handlePreviewPress = useCallback(preventDoubleTap((idx: number) => {
        if (files.length) {
            const items = files.map((f) => fileToGalleryItem(f, f.user_id));
            openGalleryAtIndex(galleryIdentifier, idx, items);
        }
    }), [files]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<ChannelBookmarkModel>) => {
        return (
            <ChannelBookmark
                bookmark={item}
                canDeleteBookmarks={canDeleteBookmarks}
                canDownloadFiles={canDownloadFiles}
                canEditBookmarks={canEditBookmarks}
                galleryIdentifier={galleryIdentifier}
                index={item.fileId ? attachmentIndex(item.fileId) : undefined}
                onPress={handlePreviewPress}
                publicLinkEnabled={publicLinkEnabled}
            />
        );
    }, [
        attachmentIndex, bookmarks, canDownloadFiles, canDeleteBookmarks, canEditBookmarks,
        handlePreviewPress, publicLinkEnabled,
    ]);

    const renderItemSeparator = useCallback(() => (<View style={styles.emptyItemSeparator}/>), []);

    if (!bookmarks.length && showInInfo && canAddBookmarks) {
        return (
            <AddBookmark
                canUploadFiles={canUploadFiles}
                channelId={channelId}
                currentUserId={currentUserId}
                showLarge={true}
                showInInfo={showInInfo}
            />
        );
    }

    if (bookmarks.length) {
        return (
            <GalleryInit galleryIdentifier={galleryIdentifier}>
                <Animated.View>
                    <FlatList
                        bounces={true}
                        alwaysBounceHorizontal={false}
                        data={bookmarks}
                        horizontal={true}
                        ListFooterComponent={canAddBookmarks ? (
                            <View style={styles.addContainer}>
                                <AddBookmark
                                    canUploadFiles={canUploadFiles}
                                    channelId={channelId}
                                    currentUserId={currentUserId}
                                    showLarge={false}
                                    showInInfo={showInInfo}
                                />
                            </View>
                        ) : undefined}
                        renderItem={renderItem}
                        ItemSeparatorComponent={renderItemSeparator}
                    />
                    {separator &&
                    <View style={styles.separator}/>
                    }
                </Animated.View>
            </GalleryInit>
        );
    }

    return null;
};

export default ChannelBookmarks;
