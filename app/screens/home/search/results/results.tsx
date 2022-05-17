// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';

import EmptyState from './empty_state';
import Header from './header';

const SearchResults = () => {
    const [isMessageTab, setIsMessageTab] = useState<'message-tab' | 'file-tab'>('message-tab');

    const onHeaderSelect = (value: 'message-tab' | 'file-tab') => {
        setIsMessageTab(value);
    };

    return (
        <>
            <Header
                onHeaderSelect={onHeaderSelect}
                numberFiles={0}
                numberMessages={0}
            />
            <EmptyState
                searchValue={'blah'}
                showMessagesTab={isMessageTab === 'message-tab'}
            />

        </>
    );
};

export default SearchResults;

