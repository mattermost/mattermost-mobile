// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, ListRenderItemInfo, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {searchFiles} from '@actions/remote/search';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {showMobileOptionsBottomSheet} from '@screens/home/search/results/file_options/mobile_options';
import Toasts from '@screens/home/search/results/file_options/toasts';
import FileResult from '@screens/home/search/results/file_result';
import {FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {
    getFileInfosIndexes,
    getNumberFileMenuOptions,
    getOrderedFileInfos,
    getOrderedGalleryItems,
} from '@utils/files';
import {openGalleryAtIndex} from '@utils/gallery';
import {preventDoubleTap} from '@utils/tap';

import EmptyState from './empty';
import Header from './header';

import type {GalleryAction} from '@typings/screens/gallery';

type Props = {
    channelId: string;
    teamId: string;
    canDownloadFiles: boolean;
    publicLinkEnabled: boolean;
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    list: {
        paddingVertical: 8,
    },
    loading: {
        justifyContent: 'center',
        flex: 1,
    },
});

const getSearchParams = (channelId: string, searchTerm?: string, filterValue?: FileFilter) => {
    const term = `channel:${channelId}`;
    const fileExtensions = filterFileExtensions(filterValue);
    const extensionTerms = fileExtensions ? ' ' + fileExtensions : '';
    const searchTerms = searchTerm ? ' ' + searchTerm : '';
    return {
        terms: term + searchTerms + extensionTerms,
        is_or_search: true,
    };
};

const emptyFileResults: FileInfo[] = [];

const galleryIdentifier = 'search-files-location';

function ChannelFiles({
    channelId,
    teamId,
    canDownloadFiles,
    publicLinkEnabled,
}: Props) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const [action, setAction] = useState<GalleryAction>('none');
    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [loading, setLoading] = useState(true);
    const numOptions = getNumberFileMenuOptions(canDownloadFiles, publicLinkEnabled);

    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const filesForGallery = imageAttachments.concat(nonImageAttachments);

    const orderedFileInfos = useMemo(() => getOrderedFileInfos(filesForGallery), [fileInfos]);
    const fileInfosIndexes = useMemo(() => getFileInfosIndexes(orderedFileInfos), [fileInfos]);
    const orderedGalleryItems = useMemo(() => getOrderedGalleryItems(orderedFileInfos), [fileInfos]);

    const handleSearch = useCallback(async (ftr: FileFilter) => {
        const searchParams = getSearchParams(channelId, '', ftr);
        const {files} = await searchFiles(serverUrl, teamId, searchParams);
        setLoading(false);
        setFileInfos(files?.length ? files : emptyFileResults);
    }, [filter]);

    useEffect(() => {
        handleSearch(filter);
    }, [teamId, filter]);

    const onPreviewPress = useCallback(preventDoubleTap((idx: number) => {
        openGalleryAtIndex(galleryIdentifier, idx, orderedGalleryItems);
    }), [orderedGalleryItems]);

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        orderedFileInfos[idx] = file;
    };

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setLoading(true);
        setFilter(filterValue);
    }, []);

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
                channelName={channelId}
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
        fileInfosIndexes,
        onPreviewPress,
        setAction,
        publicLinkEnabled,
    ]);

    const emptyList = useMemo(() => (
        <View style={styles.empty}>
            <EmptyState/>
        </View>
    ), [theme.buttonBg]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            testID='channel_files.screen'
        >
            {loading &&
                <Loading
                    color={theme.buttonBg}
                    size='large'
                    containerStyle={[styles.loading]}
                />
            }
            {!loading &&
                <>
                    <Header
                        onFilterChanged={handleFilterChange}
                        selectedFilter={filter}
                    />
                    <FlatList
                        contentContainerStyle={orderedFileInfos.length ? styles.list : [styles.empty]}
                        ListEmptyComponent={emptyList}
                        initialNumToRender={10}
                        data={orderedFileInfos}
                        refreshing={false}
                        renderItem={renderItem}
                        scrollToOverflowEnabled={true}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={true}
                        testID='channel_files.post_list.flat_list'
                    />
                    <Toasts
                        action={action}
                        fileInfo={lastViewedFileInfo}
                        setAction={setAction}
                    />
                </>
            }
        </SafeAreaView>
    );
}

export default ChannelFiles;
