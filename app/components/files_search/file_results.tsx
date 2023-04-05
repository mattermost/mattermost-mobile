// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, ListRenderItemInfo, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import NoResultsWithTerm from '@components/no_results_with_term';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {
    getChannelNamesWithID,
    getFileInfosIndexes,
    getNumberFileMenuOptions,
    getOrderedFileInfos,
    getOrderedGalleryItems,
} from '@utils/files';
import {openGalleryAtIndex} from '@utils/gallery';
import {TabTypes} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import {showMobileOptionsBottomSheet} from './file_options/mobile_options';
import Toasts from './file_options/toasts';
import FileResult from './file_result';

import type ChannelModel from '@typings/database/models/servers/channel';
import type {GalleryAction} from '@typings/screens/gallery';

type Props = {
    canDownloadFiles: boolean;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    paddingTop: StyleProp<ViewStyle>;
    publicLinkEnabled: boolean;
    searchValue: string;
}

const galleryIdentifier = 'search-files-location';

const FileResults = ({
    canDownloadFiles,
    fileChannels,
    fileInfos,
    paddingTop,
    publicLinkEnabled,
    searchValue,
}: Props) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const [action, setAction] = useState<GalleryAction>('none');
    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);

    const containerStyle = useMemo(() => ([paddingTop, {top: fileInfos.length ? 8 : 0}]), [fileInfos, paddingTop]);
    const numOptions = getNumberFileMenuOptions(canDownloadFiles, publicLinkEnabled);

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const filesForGallery = imageAttachments.concat(nonImageAttachments);

    const channelNames = useMemo(() => getChannelNamesWithID(fileChannels), [fileChannels]);
    const orderedFileInfos = useMemo(() => getOrderedFileInfos(filesForGallery), []);
    const fileInfosIndexes = useMemo(() => getFileInfosIndexes(orderedFileInfos), []);
    const orderedGalleryItems = useMemo(() => getOrderedGalleryItems(orderedFileInfos), []);

    const onPreviewPress = useCallback(preventDoubleTap((idx: number) => {
        openGalleryAtIndex(galleryIdentifier, idx, orderedGalleryItems);
    }), [orderedGalleryItems]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFileInfos[idx] = file;
    };

    const onOptionsPress = useCallback((fInfo: FileInfo) => {
        setLastViewedFileInfo(fInfo);

        if (!isTablet) {
            showMobileOptionsBottomSheet({
                fileInfo: fInfo,
                insets,
                numOptions,
                setAction,
                theme,
            });
        }
    }, [insets, isTablet, numOptions, theme]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                channelName={channelNames[item.channel_id!]}
                fileInfo={item}
                index={fileInfosIndexes[item.id!] || 0}
                key={`${item.id}-${item.name}`}
                numOptions={numOptions}
                onOptionsPress={onOptionsPress}
                onPress={onPreviewPress}
                publicLinkEnabled={publicLinkEnabled}
                setAction={setAction}
                updateFileForGallery={updateFileForGallery}
            />
        );
    }, [
        (orderedFileInfos.length === 1) && orderedFileInfos[0].mime_type,
        canDownloadFiles,
        channelNames,
        fileInfosIndexes,
        onPreviewPress,
        setAction,
        publicLinkEnabled,
    ]);

    const noResults = useMemo(() => (
        <NoResultsWithTerm
            term={searchValue}
            type={TabTypes.FILES}
        />
    ), [searchValue]);

    return (
        <>
            <FlatList
                ListEmptyComponent={noResults}
                contentContainerStyle={containerStyle}
                data={orderedFileInfos}
                indicatorStyle='black'
                initialNumToRender={10}

                //@ts-expect-error key not defined in types
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
            <Toasts
                action={action}
                fileInfo={lastViewedFileInfo}
                setAction={setAction}
            />
        </>
    );
};

export default FileResults;
