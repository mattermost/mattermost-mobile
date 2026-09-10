// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, useLocalSearchParams} from 'expo-router';
import React from 'react';

/**
 * Legacy path redirect: thread now lives under the Home tab stack
 * so the tab bar can persist.
 */
export default function ThreadRedirect() {
    const params = useLocalSearchParams();
    return (
        <Redirect
            href={{
                pathname: '/(authenticated)/(home)/channel_list/thread',
                params,
            }}
        />
    );
}
