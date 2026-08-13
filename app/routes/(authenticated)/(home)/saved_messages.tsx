// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused} from '@react-navigation/native';
import React from 'react';

import SavedMessages from '@screens/home/saved_messages';

// Unmount when leaving the tab so withObservables re-subscribes on the next visit
// and reads current saved-post preferences. freezeOnBlur would keep a mount-time
// query that can miss preference CREATE on device SQLite.
export default function SavedMessagesTab() {
    const isFocused = useIsFocused();
    if (!isFocused) {
        return null;
    }

    return <SavedMessages/>;
}
