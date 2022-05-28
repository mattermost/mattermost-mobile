// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {Text, View} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';

import Header from './header';

type Props = {
    searchValue: string;
    selectedTab: string;
    onHeaderTabSelect: (tab: string) => void;
}

const emptyPostResults: Post[] = [];
const emptyFilesResults: FileInfo[] = [];

const notImplementedComponent = (
    <View
        style={{
            height: 400,
            flexGrow: 1,
            alignItems: 'center',
            justifyContent: 'center',
        }}
    >
        <Text>{'Not Implemented'}</Text>
    </View>
);

const SearchResults = ({
    searchValue,
    selectedTab,
    onHeaderTabSelect,
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
        content = (<>
            <Header
                onTabSelect={onHeaderTabSelect}
                numberFiles={0}
                numberMessages={0}
            />
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        </>
        );
    } else {
        content = notImplementedComponent;
    }

    return (<>

        {content}
    </>);
};

export default SearchResults;
