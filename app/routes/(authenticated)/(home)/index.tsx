// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, useLocalSearchParams} from 'expo-router';

export default function HomeIndex() {
    const params = useLocalSearchParams();

    return <Redirect href={{pathname: '/(authenticated)/(home)/channel_list', params}}/>;
}
