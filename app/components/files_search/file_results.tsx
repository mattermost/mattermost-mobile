// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, type ListRenderItemInfo, type StyleProp, type ViewStyle, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import NoResults from '@components/files_search/no_results';
import FormattedText from '@components/formatted_text';
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
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {showMobileOptionsBottomSheet} from './file_options/mobile_options';
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
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const [action, setAction] = useState<GalleryAction>('none');
    const [lastViewedFileInfo, setLastViewedFileInfo] = useState<FileInfo | undefined>(undefined);

    const containerStyle = useMemo(() => ([paddingTop, {flexGrow: 1}]), [paddingTop]);
    const numOptions = getNumberFileMenuOptions(canDownloadFiles, publicLinkEnabled);

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    const filesForGallery = useMemo(() => imageAttachments.concat(nonImageAttachments), [imageAttachments, nonImageAttachments]);

    const channelNames = useMemo(() => getChannelNamesWithID(fileChannels), [fileChannels]);
    const orderedFileInfos = useMemo(() => getOrderedFileInfos(filesForGallery), [filesForGallery]);
    const fileInfosIndexes = useMemo(() => getFileInfosIndexes(orderedFileInfos), [orderedFileInfos]);
    const orderedGalleryItems = useMemo(() => getOrderedGalleryItems(orderedFileInfos), [orderedFileInfos]);

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
        let channelName: string | undefined;
        if (!isChannelFiles && item.channel_id) {
            channelName = channelNames[item.channel_id];
        }

        return (
            <FileResult
                canDownloadFiles={canDownloadFiles}
                channelName={channelName}
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
        onOptionsPress,
        numOptions,
        publicLinkEnabled,
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
    }, [searchValue]);

    return (
        <>
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
