// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, ListRenderItemInfo, StyleProp, ViewStyle} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';
import {isImage, isVideo} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {TabTypes} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import {
    useChannelNames,
    useFileInfosIndexes,
    useOrderedFileInfos,
    useOrderedGalleryItems,
} from './file_options/hooks';
import FileResult from './file_result';

import type ChannelModel from '@typings/database/models/servers/channel';

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
    const containerStyle = useMemo(() => ({top: fileInfos.length ? 8 : 0}), [fileInfos]);

    const channelNames = useChannelNames(fileChannels);
    const orderedFileInfos = useOrderedFileInfos(fileInfos, publicLinkEnabled);
    const fileInfosIndexes = useFileInfosIndexes(orderedFileInfos);
    const orderedGalleryItems = useOrderedGalleryItems(orderedFileInfos);

    const onPreviewPress = useCallback(preventDoubleTap((idx: number) => {
        openGalleryAtIndex(galleryIdentifier, idx, orderedGalleryItems);
    }), [orderedGalleryItems]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFileInfos[idx] = file;
    };

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        const isSingleImage = orderedFileInfos.length === 1 && (isImage(orderedFileInfos[0]) || isVideo(orderedFileInfos[0]));
        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                channelName={channelNames[item.channel_id!]}
                fileInfo={item}
                index={fileInfosIndexes[item.id!] || 0}
                isSingleImage={isSingleImage}
                onPress={onPreviewPress}
                publicLinkEnabled={publicLinkEnabled}
                updateFileForGallery={updateFileForGallery}
            />
        );
    }, [
        (orderedFileInfos.length === 1) && orderedFileInfos[0].mime_type,
        canDownloadFiles,
        channelNames,
        fileInfosIndexes,
        onPreviewPress,
        publicLinkEnabled,
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
            data={orderedFileInfos}
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
