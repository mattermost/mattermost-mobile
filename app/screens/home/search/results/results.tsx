// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {Text, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';

import {MessageTab, FileTab, SelectTab} from './header';

type Props = {
    fileResults: FileInfo[];
    postResults: Post[];
    searchValue: string;
    selectedTab: SelectTab;
}

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

const SearchResults = ({searchValue, selectedTab, postResults, fileResults}: Props) => {
    const [loading, setLoading] = useState(false);

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
