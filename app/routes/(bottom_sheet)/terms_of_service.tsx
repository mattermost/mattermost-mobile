// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';

import TermsOfServiceScreen from '@screens/terms_of_service';

export default function TermsOfServiceRoute() {
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            presentation: 'transparentModal',
            contentStyle: {backgroundColor: 'transparent'},
            headerShown: false,
            gestureEnabled: false,
        });
    }, [navigation]);

    return <TermsOfServiceScreen/>;
}
