// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import UserStatusScreen from '@screens/user_status';

export default function UserStatusRoute() {
    const navigation = useNavigation();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'user_status.title', defaultMessage: 'Status'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);

    return <UserStatusScreen/>;
}
