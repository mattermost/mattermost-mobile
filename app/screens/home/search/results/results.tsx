// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, FlatList, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, Text, StyleProp, View, ViewStyle} from 'react-native';
import Animated, {useDerivedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {MIN_HEIGHT} from '@app/components/option_item';
import File from '@components/files/file';
import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {PostModel, ChannelModel} from '@database/models/server';
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
const ITEM_HEIGHT = MIN_HEIGHT;
const HEADER_HEIGHT = 185;
const galleryIdentifier = 'search-files-location';

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
    const insets = useSafeAreaInsets();
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);
    const [lastViewedIndex, setLastViewedIndex] = useState<number | undefined>(undefined);

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
                    fileInfo={orderedFilesForGallery.value[item]}
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
    }, [orderedFilesForGallery, snapPoints, setLastViewedIndex, theme]);

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
