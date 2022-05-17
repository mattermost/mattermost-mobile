// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useState} from 'react';

import EmptyState from './empty_state';
import Header from './header';

const SearchResults = () => {
    const [showMessages, setShowMessages] = useState<boolean>(true);

    const onHeaderSelect = (value: boolean) => {
        setShowMessages(value);
    };

    return (
        <>
            <Header
                onToggle={onHeaderSelect}
                showMessages={showMessages}
                numberFiles={0}
                numberMessages={0}
            />
            <EmptyState
                searchValue={'blah'}
                showMessages={showMessages}
            />

        </>
    );
};

export default SearchResults;

