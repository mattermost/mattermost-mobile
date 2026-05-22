// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect} from 'expo-router';

export default function HomeIndex() {
    return <Redirect href='/(authenticated)/(home)/channel_list'/>;
}
