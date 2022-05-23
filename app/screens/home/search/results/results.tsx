// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Text, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';

import {MessageTab, FileTab, SelectTab} from './header';

type Props = {
    searchValue: string;
    selectedTab: SelectTab;
}

const emptyPostResults: Post[] = [];
const emptyFilesResults: FileInfo[] = [];

const notImplementedComponent = (
    <View
        style={{
            height: 200,
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
        }}
    >
        <Text>{'Not Implemented'}</Text>
    </View>
);

const SearchResults = ({searchValue}: Props) => {
    const [postResults] = useState<Post[]>(emptyPostResults);
    const [fileResults] = useState<FileInfo[]>(emptyFilesResults);
    const [loading] = useState(false);

    // const serverUrl = useServerUrl();


    // const runSearch = useCallback(debounce(async (sUrl: string, term: string, searchPosts: boolean) => {
    //     let postResults, fileResults;
    //     try {
    //         const client = NetworkManager.getClient(sUrl);
    //         [postResults, fileResults] = await Promise.all([
    //             client.searchPosts(teamId, term, false),
    //             client.searchFiles(teamId, term),
    //         ]);
    //     } catch {
    //         // do nothing
    //     }

    //     if (postResults?.posts && Object.keys(postResults.posts)) {
    //         setPostResults(Object.values(postResults.posts));
    //     } else {
    //         setPostResults(emptyPostResults);
    //     }
    //     setLoading(false);
    // }, 200), [])

    // useEffect(() => {
    //     if (!searchValue) {
    //         setLoading(false);
    //     } else {
    //         setLoading(true);
    //         runSearch(serverUrl, searchValue, selectedTab === 'message-tab');
    //     }

    //     return () => {
    //         runSearch.cancel();
    //     }
    // }, [searchValue]);

    let content;
    if (loading) {
        content = notImplementedComponent;
    } else if (!searchValue) {
        content = notImplementedComponent;
    } else if (
        (selectedTab === MessageTab && postResults.length === 0) ||
        (selectedTab === FileTab && fileResults.length === 0)
    ) {
        content = (
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        );
    } else {
        content = notImplementedComponent;
    }

    return (
        <>
            {content}
        </>
    );
};

export default SearchResults;
