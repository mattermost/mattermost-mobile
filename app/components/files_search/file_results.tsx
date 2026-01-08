// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, type ListRenderItemInfo, type StyleProp, type ViewStyle, View} from 'react-native';

import NoResults from '@components/files_search/no_results';
import FormattedText from '@components/formatted_text';
import NoResultsWithTerm from '@components/no_results_with_term';
import {useTheme} from '@context/theme';
import {useImageAttachments} from '@hooks/files';
import {usePreventDoubleTap} from '@hooks/utils';
import {
    getChannelNamesWithID,
    getFileInfosIndexes,
    getOrderedFileInfos,
    getOrderedGalleryItems,
} from '@utils/files';
import {openGalleryAtIndex} from '@utils/gallery';
import {TabTypes} from '@utils/search';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Toasts from './file_options/toasts';
import FileResult from './file_result';

import type ChannelModel from '@typings/database/models/servers/channel';
import type {GalleryAction} from '@typings/screens/gallery';

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    resultsNumber: {
        ...typography('Heading', 300),
        padding: 20,
        color: theme.centerChannelColor,
    },
}));

type Props = {
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
    fileChannels: ChannelModel[];
    fileInfos: FileInfo[];
    paddingTop: StyleProp<ViewStyle>;
    publicLinkEnabled: boolean;
    searchValue: string;
    isChannelFiles?: boolean;
    isFilterEnabled?: boolean;
}

const galleryIdentifier = 'search-files-location';

const separatorStyle = {height: 10};
const Separator = () => <View style={separatorStyle}/>;

const FileResults = ({
    canDownloadFiles,
    enableSecureFilePreview,
    fileChannels,
    fileInfos,
    paddingTop,
    publicLinkEnabled,
    searchValue,
    isChannelFiles,
    isFilterEnabled,
}: Props) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    const [action, setAction] = useState<GalleryAction>('none');
    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);

    const containerStyle = useMemo(() => ([paddingTop, {flexGrow: 1}]), [paddingTop]);

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos);
    const filesForGallery = useMemo(() => imageAttachments.concat(nonImageAttachments), [imageAttachments, nonImageAttachments]);

    const channelNames = useMemo(() => getChannelNamesWithID(fileChannels), [fileChannels]);
    const orderedFileInfos = useMemo(() => getOrderedFileInfos(filesForGallery), [filesForGallery]);
    const fileInfosIndexes = useMemo(() => getFileInfosIndexes(orderedFileInfos), [orderedFileInfos]);
    const orderedGalleryItems = useMemo(() => getOrderedGalleryItems(orderedFileInfos), [orderedFileInfos]);

    const onPreviewPress = usePreventDoubleTap(useCallback((idx: number) => {
        openGalleryAtIndex(galleryIdentifier, idx, orderedGalleryItems);
    }, [orderedGalleryItems]));

    const updateFileForGallery = useCallback((idx: number, file: FileInfo) => {
        'worklet';
        orderedFileInfos[idx] = file;
    }, [orderedFileInfos]);

    const onOptionsPress = useCallback((fInfo: FileInfo) => {
        setLastViewedFileInfo(fInfo);
    }, []);

    const renderItem = useCallback(({item}: ListRenderItemInfo<FileInfo>) => {
        let channelName: string | undefined;
        if (!isChannelFiles && item.channel_id) {
            channelName = channelNames[item.channel_id];
        }

        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                enableSecureFilePreview={enableSecureFilePreview}
                publicLinkEnabled={publicLinkEnabled}
                channelName={channelName}
                fileInfo={item}
                index={fileInfosIndexes[item.id!] || 0}
                key={`${item.id}-${item.name}`}
                onOptionsPress={onOptionsPress}
                onPress={onPreviewPress}
                setAction={setAction}
                updateFileForGallery={updateFileForGallery}
            />
        );
    }, [
        canDownloadFiles,
        enableSecureFilePreview,
        publicLinkEnabled,
        channelNames,
        fileInfosIndexes,
        onPreviewPress,
        onOptionsPress,
        isChannelFiles,
        updateFileForGallery,
    ]);

    const noResults = useMemo(() => {
        if (!searchValue && isChannelFiles) {
            return (
                <NoResults isFilterEnabled={isFilterEnabled}/>
            );
        }
        return (
            <NoResultsWithTerm
                term={searchValue}
                type={TabTypes.FILES}
            />
        );
    }, [isChannelFiles, isFilterEnabled, searchValue]);

    const memoFlatList = useMemo(() => (
        <FlatList
            ListHeaderComponent={
                <FormattedText
                    style={styles.resultsNumber}
                    id='mobile.search.results'
                    defaultMessage='{count} search {count, plural, one {result} other {results}}'
                    values={{count: orderedFileInfos.length}}
                />
            }
            ItemSeparatorComponent={Separator}
            ListEmptyComponent={noResults}
            contentContainerStyle={containerStyle}
            data={orderedFileInfos}
            indicatorStyle='black'
            nestedScrollEnabled={true}
            refreshing={false}
            removeClippedSubviews={false}
            renderItem={renderItem}
            scrollToOverflowEnabled={true}
            showsVerticalScrollIndicator={true}
            testID='search_results.post_list.flat_list'
        />
    ), [
        containerStyle,
        noResults,
        orderedFileInfos,
        renderItem,
        styles.resultsNumber,
    ]);

    return (
        <>
            {memoFlatList}
            {!enableSecureFilePreview &&
            <Toasts
                action={action}
                fileInfo={lastViewedFileInfo}
                setAction={setAction}
            />
            }
        </>
    );
};

export default React.memo(FileResults);
