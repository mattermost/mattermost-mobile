// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Redirect, useLocalSearchParams} from 'expo-router';
import React from 'react';
import {Platform} from 'react-native';

import VpnScreen from '@screens/vpn';

export default function VpnRoute() {
    const {management} = useLocalSearchParams<{management?: string}>();
    if (Platform.OS !== 'android') {
        return <Redirect href='/'/>;
    }
    return <VpnScreen management={management === 'true'}/>;
}
