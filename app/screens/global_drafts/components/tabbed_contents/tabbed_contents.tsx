// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {DraftTabsHeader} from '@screens/global_drafts/components/tabbed_contents/draftTabsHeader';
import {DRAFT_SCREEN_TAB_DRAFTS} from '@screens/global_drafts';

export default function TabbedContents() {
    return (
        <View>
            <DraftTabsHeader
                draftsCount={10}
                scheduledPostCount={100}
                initialTab={DRAFT_SCREEN_TAB_DRAFTS}
            />
        </View>
    );
}
