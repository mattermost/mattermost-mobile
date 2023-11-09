// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {searchFiles} from '@actions/remote/search';
import FileResults from '@components/files_search/file_results';
import Loading from '@components/loading';
import Search from '@components/search';
import {General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {popTopScreen} from '@screens/navigation';
import {type FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {changeOpacity, getKeyboardAppearanceFromTheme} from '@utils/theme';

import Header from './header';

import type ChannelModel from '@typings/database/models/servers/channel';
import type {AvailableScreens} from '@typings/screens/navigation';

const TEST_ID = 'channel_files';

type Props = {
    channel: ChannelModel;
    componentId: AvailableScreens;
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
    searchBar: {
        marginLeft: 20,
        marginRight: Platform.select({ios: 12, default: 20}),
        marginTop: 20,
    },
    noPaddingTop: {paddingTop: 0},
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

function ChannelFiles({
    channel,
    componentId,
    canDownloadFiles,
    publicLinkEnabled,
}: Props) {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();
    const searchTimeoutId = useRef<NodeJS.Timeout | null>(null);
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [loading, setLoading] = useState(true);
    const [term, setTerm] = useState('');
    const lastSearchRequest = useRef<number>();

    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const handleSearch = useCallback(async (searchTerm: string, ftr: FileFilter) => {
        const t = Date.now();
        lastSearchRequest.current = t;
        const searchParams = getSearchParams(channel.id, searchTerm, ftr);
        const {files} = await searchFiles(serverUrl, channel.teamId, searchParams);
        if (lastSearchRequest.current !== t) {
            return;
        }
        setFileInfos(files?.length ? files : emptyFileResults);
        setLoading(false);
    }, [serverUrl, channel]);

    useEffect(() => {
        if (searchTimeoutId.current) {
            clearTimeout(searchTimeoutId.current);
        }

        searchTimeoutId.current = setTimeout(() => {
            handleSearch(term, filter);
        }, General.SEARCH_TIMEOUT_MILLISECONDS);
    }, [filter, term, handleSearch]);

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setLoading(true);
        setFilter(filterValue);
    }, []);

    const clearSearch = useCallback(() => {
        setTerm('');
    }, []);

    const onTextChange = useCallback((searchTerm: string) => {
        if (term !== searchTerm) {
            setLoading(true);
            setTerm(searchTerm);
        }
    }, [term]);

    const fileChannels = useMemo(() => [channel], [channel]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            testID={`${TEST_ID}.screen`}
        >
            <View style={styles.searchBar}>
                <Search
                    testID={`${TEST_ID}.search_bar`}
                    placeholder={formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
                    cancelButtonTitle={formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    onChangeText={onTextChange}
                    onCancel={clearSearch}
                    autoCapitalize='none'
                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                    value={term}
                />
            </View>
            <Header
                onFilterChanged={handleFilterChange}
                selectedFilter={filter}
            />
            {loading &&
                <Loading
                    color={theme.buttonBg}
                    size='large'
                    containerStyle={styles.loading}
                />
            }
            {!loading &&
            <FileResults
                canDownloadFiles={canDownloadFiles}
                fileChannels={fileChannels}
                fileInfos={fileInfos}
                paddingTop={styles.noPaddingTop}
                publicLinkEnabled={publicLinkEnabled}
                searchValue={term}
                isChannelFiles={true}
                isFilterEnabled={filter !== FileFilters.ALL}
            />
            }
        </SafeAreaView>
    );
}

export default ChannelFiles;
