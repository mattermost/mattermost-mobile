// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, FlatList, ListRenderItemInfo, StyleProp, View, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ITEM_HEIGHT} from '@app/components/option_item';
import File from '@components/files/file';
import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {getViewPortWidth} from '@utils/images';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes, TabType} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import FileOptions from './file_options';
import {HEADER_HEIGHT} from './file_options/header';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
    },
});

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
    canDownloadFiles: boolean;
    currentTimezone: string;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    searchValue: string;
    selectedTab: TabType;
}

const galleryIdentifier = 'search-files-location';

const SearchResults = ({
    canDownloadFiles,
    currentTimezone,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    searchValue,
    selectedTab,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const [lastViewedIndex, setLastViewedIndex] = useState<number | undefined>(undefined);

    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);
    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const channelNames = useMemo(() => fileChannels.reduce<{[id: string]: string | undefined}>((acc, v) => {
        acc[v.id] = v.displayName;
        return acc;
    }, {}), [fileChannels]);

    const containerStyle = useMemo(() => {
        let padding = 0;
        if (selectedTab === TabTypes.MESSAGES) {
            padding = posts.length ? 4 : 8;
        } else {
            padding = fileInfos.length ? 8 : 0;
        }
        return {top: padding};
    }, [selectedTab, posts, fileInfos]);

    const filesForGallery = useMemo(() => imageAttachments.concat(nonImageAttachments),
        [imageAttachments, nonImageAttachments]);

    const orderedFilesForGallery = useMemo(() => (
        filesForGallery.sort((a: FileInfo, b: FileInfo) => {
            return (b.create_at || 0) - (a.create_at || 0);
        })
    ), [filesForGallery]);

    const filesForGalleryIndexes = useMemo(() => orderedFilesForGallery.reduce<{[id: string]: number | undefined}>((acc, v, idx) => {
        if (v.id) {
            acc[v.id] = idx;
        }
        return acc;
    }, {}), [orderedFilesForGallery]);

    const handlePreviewPress = useCallback(preventDoubleTap((idx: number) => {
        const items = orderedFilesForGallery.map((f) => fileToGalleryItem(f, f.user_id));
        openGalleryAtIndex(galleryIdentifier, idx, items);
    }), [orderedFilesForGallery]);

    const snapPoints = useMemo(() => {
        let numberOptions = 1;
        if (canDownloadFiles) {
            numberOptions += 1;
        }
        if (publicLinkEnabled) {
            numberOptions += 1;
        }
        return [bottomSheetSnapPoint(numberOptions, ITEM_HEIGHT, insets.bottom) + HEADER_HEIGHT, 10];
    }, [canDownloadFiles, publicLinkEnabled]);

    const handleOptionsPress = useCallback((item: number) => {
        setLastViewedIndex(item);
        const renderContent = () => {
            return (
                <FileOptions
                    fileInfo={orderedFilesForGallery[item]}
                />
            );
        };
        bottomSheet({
            closeButtonId: 'close-search-file-options',
            renderContent,
            snapPoints,
            theme,
            title: '',
        });
    }, [orderedFilesForGallery, snapPoints, theme]);

    // This effect handles the case where a user has the FileOptions Modal
    // open and the server changes the ability to download files or copy public
    // links. Reopen the Bottom Sheet again so the new options are added or
    // removed.
    useEffect(() => {
        if (lastViewedIndex === undefined) {
            return;
        }
        if (NavigationStore.getNavigationTopComponentId() === 'BottomSheet') {
            dismissBottomSheet().then(() => {
                handleOptionsPress(lastViewedIndex);
            });
        }
    }, [canDownloadFiles, publicLinkEnabled]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string|FileInfo | Post>) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }
            return null;
        }

        if ('message' in item) {
            return (
                <PostWithChannelInfo
                    location={Screens.SEARCH}
                    post={item}
                    testID='search_results.post_list'
                />
            );
        }

        const updateFileForGallery = (idx: number, file: FileInfo) => {
            'worklet';
            orderedFilesForGallery[idx] = file;
        };

        const container: StyleProp<ViewStyle> = fileInfos.length > 1 ? styles.container : undefined;
        const isSingleImage = orderedFilesForGallery.length === 1 && (isImage(orderedFilesForGallery[0]) || isVideo(orderedFilesForGallery[0]));
        const isReplyPost = false;

        return (
            <View
                style={container}
                key={item.id}
            >
                <File
                    channelName={channelNames[item.channel_id!]}
                    galleryIdentifier={galleryIdentifier}
                    key={item.id}
                    canDownloadFiles={canDownloadFiles}
                    file={item}
                    index={filesForGalleryIndexes[item.id!] || 0}
                    onPress={handlePreviewPress}
                    onOptionsPress={handleOptionsPress}
                    isSingleImage={isSingleImage}
                    showDate={true}
                    publicLinkEnabled={publicLinkEnabled}
                    updateFileForGallery={updateFileForGallery}
                    inViewPort={true}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                    nonVisibleImagesCount={0}
                    asCard={true}
                />
            </View>
        );
    }, [
        theme,
        (orderedFilesForGallery.length === 1) && orderedFilesForGallery[0].mime_type,
        handleOptionsPress,
        channelNames,
        filesForGalleryIndexes,
        canDownloadFiles,
        handlePreviewPress,
        publicLinkEnabled,
        isTablet,
        fileInfos.length > 1,
    ]);

    const noResults = useMemo(() => {
        return (
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        );
    }, [searchValue, selectedTab]);

    let data;
    if (selectedTab === TabTypes.MESSAGES) {
        data = orderedPosts;
    } else {
        data = orderedFilesForGallery;
    }

    return (
        <AnimatedFlatList
            ListEmptyComponent={noResults}
            data={data}
            scrollToOverflowEnabled={true}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            indicatorStyle='black'
            refreshing={false}
            renderItem={renderItem}
            contentContainerStyle={paddingTop}
            nestedScrollEnabled={true}
            removeClippedSubviews={true}
            style={containerStyle}
            testID='search_results.post_list.flat_list'
        />
    );
};

export default SearchResults;
