// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {StyleSheet, FlatList, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, Text, StyleProp, View, ViewStyle} from 'react-native';
import Animated, {useDerivedValue} from 'react-native-reanimated';

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
    flex: {flex: 1},
    container: {
        flex: 1,
        marginHorizontal: 20,
    },
});

const notImplementedComponent = (
    <View
        style={{
            height: 800,
            flexGrow: 1,
            alignItems: 'center',
        }}
    >
        <Text style={{fontSize: 28, color: '#000'}}>{'Not Implemented'}</Text>
    </View>
);

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
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const isTablet = useIsTablet();

    const containerStyle = useMemo(() => {
        let padding = 0;
        if (selectedTab === TabTypes.MESSAGES) {
            padding = posts.length ? 4 : 8;
        } else {
            padding = fileInfos.length ? 8 : 0;
        }
        return {top: padding};
    }, [selectedTab, posts, fileInfos]);

    const getChannelName = (id: string) => {
        return fileChannels.find((c) => c.id === id)?.displayName;
    };

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const filesForGallery = useDerivedValue(() => imageAttachments.concat(nonImageAttachments),
        [imageAttachments, nonImageAttachments]);

    const orderedFilesForGallery = useDerivedValue(() => (
        filesForGallery.value.sort((a: FileInfo, b: FileInfo) => {
            return (b.create_at || 0) - (a.create_at || 0);
        })
    ), [filesForGallery]);

    const handlePreviewPress = useCallback(preventDoubleTap((idx: number) => {
        const items = orderedFilesForGallery.value.map((f) => fileToGalleryItem(f, f.user_id));
        openGalleryAtIndex(galleryIdentifier, idx, items);
    }), [orderedFilesForGallery]);

    const handleOptionsPress = useCallback(preventDoubleTap(() => {
        // hook up in another PR
        // https://github.com/mattermost/mattermost-mobile/pull/6420
        // https://mattermost.atlassian.net/browse/MM-44939
    }), []);

    const attachmentIndex = (fileId: string) => {
        return orderedFilesForGallery.value.findIndex((file) => file.id === fileId) || 0;
    };

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
                />
            );
        }

        if (!fileInfos.length) {
            return noResults;
        }
        const updateFileForGallery = (idx: number, file: FileInfo) => {
            'worklet';
            orderedFilesForGallery.value[idx] = file;
        };

        const container: StyleProp<ViewStyle> = fileInfos.length > 1 ? styles.container : undefined;
        const isSingleImage = orderedFilesForGallery.value.length === 1 && (isImage(orderedFilesForGallery.value[0]) || isVideo(orderedFilesForGallery.value[0]));
        const isReplyPost = false;

        return (
            <View
                style={container}
                key={item.id}
            >
                <File
                    channelName={getChannelName(item.channel_id!)}
                    galleryIdentifier={galleryIdentifier}
                    key={item.id}
                    canDownloadFiles={canDownloadFiles}
                    file={item}
                    index={attachmentIndex(item.id!)}
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
    }, [theme, orderedFilesForGallery, fileChannels, handleOptionsPress]);

    const noResults = useMemo(() => {
        if (searchValue) {
            if (loading) {
                return (<Loader/>);
            }
            return (
                <NoResultsWithTerm
                    term={searchValue}
                    type={selectedTab}
                />
            );
        }

        return notImplementedComponent;
    }, [searchValue, loading, selectedTab]);

    let data;
    if (loading || !searchValue) {
        data = emptyList;
    } else if (selectedTab === TabTypes.MESSAGES) {
        data = orderedPosts;
    } else {
        data = orderedFilesForGallery.value;
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
        />
    );
};

export default Results;
