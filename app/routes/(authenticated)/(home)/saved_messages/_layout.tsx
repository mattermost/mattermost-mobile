// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import HomeTabStackLayout from '@components/chrome/home_tab_stack_layout';

export default function SavedMessagesLayout() {
    const intl = useIntl();

    return (
        <HomeTabStackLayout
            title={intl.formatMessage({id: 'screen.saved_messages.title', defaultMessage: 'Saved Messages'})}
        />
    );
}
