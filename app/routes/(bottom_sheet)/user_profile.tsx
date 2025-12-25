// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import UserProfileScreen, {type UserProfileProps} from '@screens/user_profile';

export default function UserProfileRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<UserProfileProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);
    return <UserProfileScreen {...props}/>;
}
