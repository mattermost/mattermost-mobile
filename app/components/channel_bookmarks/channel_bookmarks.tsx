// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient, type LinearGradientProps} from 'expo-linear-gradient';
import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, View, type ListRenderItemInfo, type NativeSyntheticEvent, type NativeScrollEvent} from 'react-native';
import Animated from 'react-native-reanimated';

import {GalleryInit} from '@context/gallery';
import {useTheme} from '@context/theme';
import {useChannelBookmarkFiles} from '@hooks/files';
import {usePreventDoubleTap} from '@hooks/utils';
import ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
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
    enableSecureFilePreview: boolean;
    publicLinkEnabled: boolean;
    showInInfo: boolean;
    separator?: boolean;
}

const GRADIENT_LOCATIONS: LinearGradientProps['locations'] = [0, 0.64, 1];
const SCROLL_OFFSET = 10;

const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}: NativeScrollEvent) => {
    return layoutMeasurement.width + contentOffset.x <= contentSize.width - SCROLL_OFFSET;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        marginTop: 8,
        marginBottom: 24,
    },
    emptyItemSeparator: {
        width: 20,
    },
    addContainer: {
        width: 40,
        alignContent: 'center',
    },
    gradient: {
        height: 48,
        width: 68,
        position: 'absolute',
        right: 0,
    },
    channelView: {
        paddingHorizontal: 8,
    },
}));

const ChannelBookmarks = ({
    bookmarks, canAddBookmarks, canDeleteBookmarks, canDownloadFiles, canEditBookmarks, canUploadFiles,
    channelId, currentUserId, enableSecureFilePreview, publicLinkEnabled, showInInfo, separator = true,
}: Props) => {
    const galleryIdentifier = `${channelId}-bookmarks`;
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const files = useChannelBookmarkFiles(bookmarks);
    const [allowEndFade, setAllowEndFade] = useState(true);

    const attachmentIndex = useCallback((fileId: string) => {
        return files.findIndex((file) => file.id === fileId) || 0;
    }, [files]);

    const handlePreviewPress = usePreventDoubleTap(useCallback((idx: number) => {
        if (files.length) {
            const items = files.map((f) => fileToGalleryItem(f, f.user_id));
            openGalleryAtIndex(galleryIdentifier, idx, items);
        }
    }, [files, galleryIdentifier]));

    const renderItem = useCallback(({item}: ListRenderItemInfo<ChannelBookmarkModel>) => {
        return (
            <ChannelBookmark
                bookmark={item}
                canDeleteBookmarks={canDeleteBookmarks}
                canDownloadFiles={canDownloadFiles}
                canEditBookmarks={canEditBookmarks}
                enableSecureFilePreview={enableSecureFilePreview}
                galleryIdentifier={galleryIdentifier}
                index={item.fileId ? attachmentIndex(item.fileId) : undefined}
                onPress={handlePreviewPress}
                publicLinkEnabled={publicLinkEnabled}
            />
        );
    }, [
        canDeleteBookmarks, canDownloadFiles, canEditBookmarks, enableSecureFilePreview,
        galleryIdentifier, attachmentIndex, handlePreviewPress,
        publicLinkEnabled,
    ]);

    const renderItemSeparator = useCallback(() => (<View style={styles.emptyItemSeparator}/>), []);

    const onScrolled = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        setAllowEndFade(isCloseToBottom(e.nativeEvent));
    }, []);

    const gradientColors: LinearGradientProps['colors'] = useMemo(() => [
        theme.centerChannelBg,
        changeOpacity(theme.centerChannelBg, 0.6458),
        changeOpacity(theme.centerChannelBg, 0),
    ], [theme]);

    if (!bookmarks.length && showInInfo && canAddBookmarks) {
        return (
            <AddBookmark
                bookmarksCount={0}
                canUploadFiles={canUploadFiles}
                channelId={channelId}
                currentUserId={currentUserId}
                showLarge={true}
            />
        );
    }

    if (bookmarks.length) {
        return (
            <GalleryInit galleryIdentifier={galleryIdentifier}>
                <Animated.View>
                    <Animated.View style={[styles.container, showInInfo ? undefined : styles.channelView]}>
                        <FlatList
                            bounces={true}
                            alwaysBounceHorizontal={false}
                            data={bookmarks}
                            horizontal={true}
                            renderItem={renderItem}
                            ItemSeparatorComponent={renderItemSeparator}
                            onScroll={onScrolled}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{height: 48, alignItems: 'center'}}
                        />
                        {canAddBookmarks &&
                            <View style={styles.addContainer}>
                                {allowEndFade &&
                                <LinearGradient
                                    locations={GRADIENT_LOCATIONS}
                                    colors={gradientColors}
                                    style={styles.gradient}
                                    pointerEvents={'none'}
                                />
                                }
                                <AddBookmark
                                    bookmarksCount={bookmarks.length}
                                    canUploadFiles={canUploadFiles}
                                    channelId={channelId}
                                    currentUserId={currentUserId}
                                    showLarge={false}
                                />
                            </View>
                        }
                    </Animated.View>
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
