// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {StyleSheet, FlatList, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, StyleProp, View, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import File from '@components/files/file';
import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes, TabType} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import Loader from './loader';

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
    loading: boolean;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    posts: PostModel[];
    publicLinkEnabled: boolean;
    scrollPaddingTop: number;
    scrollRef: React.RefObject<FlatList>;
    searchValue: string;
    selectedTab: TabType;
}

const emptyList: FileInfo[] | Array<string | PostModel> = [];
const galleryIdentifier = 'search-files-location';

const Results = ({
    canDownloadFiles,
    currentTimezone,
    fileChannels,
    fileInfos,
    isTimezoneEnabled,
    loading,
    onScroll,
    posts,
    publicLinkEnabled,
    scrollPaddingTop,
    scrollRef,
    searchValue,
    selectedTab,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
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

    const handleOptionsPress = useCallback(preventDoubleTap(() => {
        // hook up in another PR
        // https://github.com/mattermost/mattermost-mobile/pull/6420
        // https://mattermost.atlassian.net/browse/MM-44939
    }), []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string|FileInfo | Post>) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
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
                    theme={theme}
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
        if (loading) {
            return (<Loader/>);
        }
        return (
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        );
    }, [searchValue, loading, selectedTab]);

    let data;
    if (loading || !searchValue) {
        data = emptyList;
    } else if (selectedTab === TabTypes.MESSAGES) {
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
            onScroll={onScroll}
            removeClippedSubviews={true}
            ref={scrollRef}
            style={containerStyle}
            testID='search_results.post_list.flat_list'
        />
    );
};

export default Results;
