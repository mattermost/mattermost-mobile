// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, ListRenderItemInfo, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import NoResultsWithTerm from '@components/no_results_with_term';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {isImage, isVideo} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {TabTypes} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import {
    useChannelNames,
    useFileInfosIndexes,
    useHandleFileOptions,
    useNumberItems,
    useOrderedFileInfos,
    useOrderedGalleryItems,
} from './file_options/hooks';
import {showMobileOptionsBottomSheet} from './file_options/mobile_options';
import Toasts from './file_options/toasts';
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
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const theme = useTheme();

    const [selectedItemNumber, setSelectedItemNumber] = useState<number | undefined>(undefined);
    const [lastViewedIndex, setLastViewedIndex] = useState<number | undefined>(undefined);
    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);

    const containerStyle = useMemo(() => ({top: fileInfos.length ? 8 : 0}), [fileInfos]);
    const numOptions = useNumberItems(canDownloadFiles, publicLinkEnabled);

    const channelNames = useChannelNames(fileChannels);
    const orderedFileInfos = useOrderedFileInfos(fileInfos, publicLinkEnabled);
    const fileInfosIndexes = useFileInfosIndexes(orderedFileInfos);
    const orderedGalleryItems = useOrderedGalleryItems(orderedFileInfos);

    const onPreviewPress = useCallback(preventDoubleTap((idx: number) => {
        openGalleryAtIndex(galleryIdentifier, idx, orderedGalleryItems);
    }), [orderedFileInfos]);

    const {action, handleCopyLink, handleDownload, handlePermalink, setAction} =
        useHandleFileOptions({postId: lastViewedFileInfo?.post_id, setSelectedItemNumber});
    const onOptionsPress = useCallback((item: number) => {
        setLastViewedIndex(item);
        setLastViewedFileInfo(orderedFileInfos[item]);
        if (isTablet) {
            // setOpenTabletOptions(true);
            setSelectedItemNumber(selectedItemNumber === item ? undefined : item);
            return;
        }

        showMobileOptionsBottomSheet({
            canDownloadFiles,
            fileInfo: orderedFileInfos[item],
            insets,
            numOptions,
            publicLinkEnabled,
            setSelectedItemNumber,
            theme,
        });
    }, [
        canDownloadFiles, handleCopyLink, handleDownload, handlePermalink,
        isTablet, numOptions, orderedFileInfos, publicLinkEnabled,
        selectedItemNumber, theme,
    ]);

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
                onOptionsPress(lastViewedIndex);
            });
        }
    }, [canDownloadFiles, publicLinkEnabled]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFileInfos[idx] = file;
    };

    const optionSelected = useCallback((item: FileInfo) => {
        return selectedItemNumber === fileInfosIndexes[item.id!];
    }, [selectedItemNumber, fileInfosIndexes]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        const isSingleImage = orderedFileInfos.length === 1 && (isImage(orderedFileInfos[0]) || isVideo(orderedFileInfos[0]));
        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                channelName={channelNames[item.channel_id!]}
                fileInfo={item}
                handleCopyLink={handleCopyLink}
                handleDownload={handleDownload}
                handlePermalink={handlePermalink}
                index={fileInfosIndexes[item.id!] || 0}
                isSingleImage={isSingleImage}
                onOptionsPress={onOptionsPress}
                onPress={onPreviewPress}
                optionSelected={optionSelected(item)}
                publicLinkEnabled={publicLinkEnabled}
                setSelectedItemNumber={setSelectedItemNumber}
                updateFileForGallery={updateFileForGallery}
            />
        );
    }, [
        (orderedFileInfos.length === 1) && orderedFileInfos[0].mime_type,
        canDownloadFiles,
        channelNames,
        fileInfosIndexes,
        handleCopyLink,
        handleDownload,
        handlePermalink,
        onOptionsPress,
        onPreviewPress,
        publicLinkEnabled,
        selectedItemNumber,
        optionSelected,
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
            <Toasts
                action={action}
                fileInfo={orderedFileInfos[lastViewedIndex!]}
                setAction={setAction}
                setSelectedItemNumber={setSelectedItemNumber}
            />
        </>
    );
};

export default FileResults;
