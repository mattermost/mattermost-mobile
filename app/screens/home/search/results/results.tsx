// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {Text} from 'react-native';

import EmptyState from './empty_state';
import Header from './header';

type Props = {
    searchValue: string;
}

const emptyPostResults: Post[] = [];
const emptyFilesResults: FileInfo[] = [];

const SearchResults = ({searchValue}: Props) => {
    const [selectedTab, setSelectedTab] = useState<'message-tab' | 'file-tab'>('message-tab');
    const [postResults] = useState<Post[]>(emptyPostResults);
    const [fileResults] = useState<FileInfo[]>(emptyFilesResults);
    const [loading] = useState(false);

    // const serverUrl = useServerUrl();

    const onHeaderSelect = useCallback((value: 'message-tab' | 'file-tab') => {
        setSelectedTab(value);
    }, []);

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
        content = <Text>{'Not Implemented'}</Text>;
    } else if (!searchValue) {
        content = <Text>{'Not Implemented'}</Text>;
    } else if (
        (selectedTab === 'message-tab' && postResults.length === 0) ||
        (selectedTab === 'file-tab' && fileResults.length === 0)
    ) {
        content = (
            <EmptyState
                searchValue={searchValue}
                showMessagesTab={selectedTab === 'message-tab'}
            />
        );
    } else {
        content = <Text>{'Not Implemented'}</Text>;
    }

    return (
        <>
            <Header
                onHeaderSelect={onHeaderSelect}
                numberFiles={fileResults.length}
                numberMessages={postResults.length}
            />
            {content}
        </>
    );
};

export default SearchResults;

