// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {StyleSheet, FlatList, ListRenderItemInfo, StyleProp, View, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import File from '@components/files/file';
import NoResultsWithTerm from '@components/no_results_with_term';
import {ITEM_HEIGHT} from '@components/option_item';
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
import {TabTypes} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import FileOptions from './file_options';
import {HEADER_HEIGHT} from './file_options/header';

import type ChannelModel from '@typings/database/models/servers/channel';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginHorizontal: 20,
    },
});

type Props = {
    canDownloadFiles: boolean;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    publicLinkEnabled: boolean;
    paddingTop: StyleProp<ViewStyle>;
    searchValue: string;
}

const galleryIdentifier = 'search-files-location';

const FileResults = ({
    canDownloadFiles,
    fileChannels,
    fileInfos,
    publicLinkEnabled,
    paddingTop,
    searchValue,
}: Props) => {
    const theme = useTheme();
    const isTablet = useIsTablet();
    const insets = useSafeAreaInsets();
    const [lastViewedIndex, setLastViewedIndex] = useState<number | undefined>(undefined);
    const containerStyle = useMemo(() => ({top: fileInfos.length ? 8 : 0}), [fileInfos]);

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const channelNames = useMemo(() => fileChannels.reduce<{[id: string]: string | undefined}>((acc, v) => {
        acc[v.id] = v.displayName;
        return acc;
    }, {}), [fileChannels]);

    const orderedFilesForGallery = useMemo(() => {
        const filesForGallery = imageAttachments.concat(nonImageAttachments);
        return filesForGallery.sort((a: FileInfo, b: FileInfo) => {
            return (b.create_at || 0) - (a.create_at || 0);
        });
    }, [imageAttachments, nonImageAttachments]);

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

    const handleOptionsPress = useCallback((item: number) => {
        setLastViewedIndex(item);
        let numberOptions = 1;
        numberOptions += canDownloadFiles ? 1 : 0;
        numberOptions += publicLinkEnabled ? 1 : 0;
        const renderContent = () => (
            <FileOptions
                fileInfo={orderedFilesForGallery[item]}
            />
        );
        bottomSheet({
            closeButtonId: 'close-search-file-options',
            renderContent,
            snapPoints: [bottomSheetSnapPoint(numberOptions, ITEM_HEIGHT, insets.bottom) + HEADER_HEIGHT, 10],
            theme,
            title: '',
        });
    }, [canDownloadFiles, publicLinkEnabled, orderedFilesForGallery, theme]);

    // This effect handles the case where a user has the FileOptions Modal
    // open and the server changes the ability to download files or copy public
    // links. Reopen the Bottom Sheet again so the new options are added or
    // removed.
    useEffect(() => {
        if (lastViewedIndex === undefined) {
            return;
        }
        if (NavigationStore.getNavigationTopComponentId() === Screens.BOTTOM_SHEET) {
            dismissBottomSheet().then(() => {
                handleOptionsPress(lastViewedIndex);
            });
        }
    }, [canDownloadFiles, publicLinkEnabled]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFilesForGallery[idx] = file;
    };

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        const container: StyleProp<ViewStyle> = fileInfos.length > 1 ? styles.container : undefined;
        const isSingleImage = orderedFilesForGallery.length === 1 && (isImage(orderedFilesForGallery[0]) || isVideo(orderedFilesForGallery[0]));
        const isReplyPost = false;

        return (
            <View
                style={container}
                key={item.id}
            >
                <File
                    asCard={true}
                    canDownloadFiles={canDownloadFiles}
                    channelName={channelNames[item.channel_id!]}
                    file={item}
                    galleryIdentifier={galleryIdentifier}
                    inViewPort={true}
                    index={filesForGalleryIndexes[item.id!] || 0}
                    isSingleImage={isSingleImage}
                    key={item.id}
                    nonVisibleImagesCount={0}
                    onOptionsPress={handleOptionsPress}
                    onPress={handlePreviewPress}
                    publicLinkEnabled={publicLinkEnabled}
                    showDate={true}
                    updateFileForGallery={updateFileForGallery}
                    wrapperWidth={(getViewPortWidth(isReplyPost, isTablet) - 6)}
                />
            </View>
        );
    }, [
        (orderedFilesForGallery.length === 1) && orderedFilesForGallery[0].mime_type,
        canDownloadFiles,
        channelNames,
        fileInfos.length > 1,
        filesForGalleryIndexes,
        handleOptionsPress,
        handlePreviewPress,
        isTablet,
        publicLinkEnabled,
        theme,
    ]);

    const noResults = useMemo(() => (
        <NoResultsWithTerm
            term={searchValue}
            type={TabTypes.FILES}
        />
    ), [searchValue]);

    return (
        <FlatList
            ListEmptyComponent={noResults}
            contentContainerStyle={[paddingTop, containerStyle]}
            data={orderedFilesForGallery}
            indicatorStyle='black'
            initialNumToRender={10}
            listKey={'files'}
            maxToRenderPerBatch={5}
            nestedScrollEnabled={true}
            refreshing={false}
            removeClippedSubviews={true}
            renderItem={renderItem}
            scrollEventThrottle={16}
            scrollToOverflowEnabled={true}
            showsVerticalScrollIndicator={true}
            testID='search_results.post_list.flat_list'
        />
    );
};

export default FileResults;
