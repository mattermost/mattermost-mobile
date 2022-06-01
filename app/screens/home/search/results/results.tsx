// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {Text, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';

type Props = {
    searchValue: string;
    selectedTab: string;
}

const emptyPostResults: Post[] = [];
const emptyFilesResults: FileInfo[] = [];

const notImplementedComponent = (
    <View
        style={{
            height: 800,
            flexGrow: 1,
            alignItems: 'center',
        }}
    >
        <Text style={{fontSize: 28, color: '#000'}}>{'Not Implemented'}</Text>
    </View>
);

const SearchResults = ({
    searchValue,
    selectedTab,
}: Props) => {
    const [postResults] = useState<Post[]>(emptyPostResults);
    const [fileResults] = useState<FileInfo[]>(emptyFilesResults);
    const [loading] = useState(false);

    let content;
    if (loading) {
        content = notImplementedComponent;
    } else if (!searchValue) {
        content = notImplementedComponent;
    } else if (
        (selectedTab === 'messages' && postResults.length === 0) ||
        (selectedTab === 'files' && fileResults.length === 0)
    ) {
        content = (
            <View
                style={{
                    height: 800,
                    flexGrow: 1,
                    alignItems: 'center',
                }}
            >
                <NoResultsWithTerm
                    term={searchValue}
                    type={selectedTab}
                />
            </View>
        );
    } else {
        content = notImplementedComponent;
    }

    return (<>

        {content}
    </>);
};

export default SearchResults;
