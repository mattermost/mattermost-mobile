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
import {PostModel, ChannelModel} from '@database/models/server';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes, TabType} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import Loader from './loader';

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
    searchValue: string;
    selectedTab: TabType;
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    scrollRef: React.RefObject<FlatList>;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollPaddingTop: number;
    loading: boolean;
    canDownloadFiles: boolean;
    publicLinkEnabled: boolean;
}

const emptyList: FileInfo[] | Array<string | PostModel> = [];

const Results = ({
    currentTimezone,
    fileInfos,
    isTimezoneEnabled,
    posts,
    fileChannels,
    searchValue,
    selectedTab,
    scrollRef,
    onScroll,
    scrollPaddingTop,
    loading,
    canDownloadFiles,
    publicLinkEnabled,
}: Props) => {
    const theme = useTheme();
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const orderedFileInfos = useMemo(() => (
        fileInfos.sort((a: FileInfo, b: FileInfo) => {
            return b.create_at! - a.create_at!;
        })
    ), [fileInfos]);

    const isTablet = useIsTablet();
    const galleryIdentifier = 'search-files-location';

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(orderedFileInfos, publicLinkEnabled);

    const getContainerStyle = useMemo(() => {
        let padding = 0;
        if (selectedTab === TabTypes.MESSAGES) {
            padding = posts.length ? 4 : 8;
        } else {
            padding = orderedFileInfos.length ? 8 : 0;
        }
        return {top: padding};
    }, [selectedTab, posts, orderedFileInfos]);

    const getChannelName = useCallback((id: string) => {
        return fileChannels.find((c) => c.id === id)?.displayName;
    }, [fileChannels]);

    const handlePreviewPress = preventDoubleTap((idx: number) => {
        const items = filesForGallery.value.map((f) => fileToGalleryItem(f, f.user_id));
        openGalleryAtIndex(galleryIdentifier, idx, items);
    });

    const handleOptionsPress = preventDoubleTap((idx: number) => {
        /* eslint-disable no-console */
        console.log('Options button pressed for..  ', idx);
    });

    const filesForGallery = useDerivedValue(() => imageAttachments.concat(nonImageAttachments),
        [imageAttachments, nonImageAttachments]);

    const attachmentIndex = (fileId: string) => {
        return filesForGallery.value.findIndex((file) => file.id === fileId) || 0;
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

        if (!orderedFileInfos.length) {
            return noResults;
        }
        const updateFileForGallery = (idx: number, file: FileInfo) => {
            'worklet';
            filesForGallery.value[idx] = file;
        };
        const container: StyleProp<ViewStyle> = orderedFileInfos.length > 1 ? styles.container : undefined;
        const isSingleImage = orderedFileInfos.length === 1 && (isImage(orderedFileInfos[0]) || isVideo(orderedFileInfos[0]));
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
    }, [theme, orderedFileInfos, fileChannels]);

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
        data = orderedFileInfos;
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
            style={getContainerStyle}
        />
    );
};

export default Results;
