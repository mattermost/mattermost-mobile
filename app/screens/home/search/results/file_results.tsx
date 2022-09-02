// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, ListRenderItemInfo, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import NoResultsWithTerm from '@components/no_results_with_term';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {dismissBottomSheet} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {TabTypes} from '@utils/search';
import {preventDoubleTap} from '@utils/tap';

import {useHandleFileOptions} from './file_options/hooks';
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

    const containerStyle = useMemo(() => ({top: fileInfos.length ? 8 : 0}), [fileInfos]);

    const numOptions = useMemo(() => {
        let numberItems = 1;
        numberItems += canDownloadFiles ? 1 : 0;
        numberItems += publicLinkEnabled ? 1 : 0;
        return numberItems;
    }, [canDownloadFiles, publicLinkEnabled]);

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

    const {
        action,
        handleCopyLink,
        handleDownload,
        handlePermalink,
        setAction,
    } = useHandleFileOptions({lastViewedIndex, orderedFilesForGallery, setSelectedItemNumber});
    const handleOptionsPress = useCallback((item: number) => {
        if (isTablet) {
            // setOpenTabletOptions(true);
            setSelectedItemNumber(selectedItemNumber === item ? undefined : item);
            return;
        }

        showMobileOptionsBottomSheet({
            canDownloadFiles,
            fileInfo: orderedFilesForGallery[item],
            handleCopyLink,
            handleDownload,
            handlePermalink,
            insets,
            numOptions,
            publicLinkEnabled,
            theme,
        });
    }, [
        canDownloadFiles, handleCopyLink, handleDownload, handlePermalink,
        isTablet, numOptions, orderedFilesForGallery, publicLinkEnabled,
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
                handleOptionsPress(lastViewedIndex);
            });
        }
    }, [canDownloadFiles, publicLinkEnabled]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFilesForGallery[idx] = file;
    };

    const optionSelected = useCallback((item: FileInfo) => {
        return selectedItemNumber === filesForGalleryIndexes[item.id!];
    }, [selectedItemNumber, filesForGalleryIndexes]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        const isSingleImage = orderedFilesForGallery.length === 1 && (isImage(orderedFilesForGallery[0]) || isVideo(orderedFilesForGallery[0]));
        const optionSelected = selectedItemNumber === filesForGalleryIndexes[item.id!];
        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                channelName={channelNames[item.channel_id!]}
                fileInfo={item}
                handleCopyLink={handleCopyLink}
                handleDownload={handleDownload}
                handlePermalink={handlePermalink}
                index={filesForGalleryIndexes[item.id!] || 0}
                isSingleImage={isSingleImage}
                numOptions={numOptions}
                onOptionsPress={handleOptionsPress}
                onPress={handlePreviewPress}
                optionSelected={optionSelected}
                publicLinkEnabled={publicLinkEnabled}
                setSelectedItemNumber={setSelectedItemNumber}
                updateFileForGallery={updateFileForGallery}
            />
        );
    }, [
        (orderedFilesForGallery.length === 1) && orderedFilesForGallery[0].mime_type,
        canDownloadFiles,
        channelNames,
        filesForGalleryIndexes,
        handleCopyLink,
        handleDownload,
        handlePermalink,
        handleOptionsPress,
        handlePreviewPress,
        numOptions,
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
            <Toasts
                action={action}
                fileInfo={orderedFilesForGallery[lastViewedIndex!]}
                setAction={setAction}
                setSelectedItemNumber={setSelectedItemNumber}
            />
        </>
    );
};

export default FileResults;
