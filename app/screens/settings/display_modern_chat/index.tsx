// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeModernChatEnabled} from '@queries/app/global';

import DisplayModernChat from './display_modern_chat';

const enhanced = withObservables([], () => {
    const isModernChatEnabled = observeModernChatEnabled();

    return {
        isModernChatEnabled,
    };
});

export default withDatabase(enhanced(DisplayModernChat));
