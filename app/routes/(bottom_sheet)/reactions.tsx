// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import ReactionsScreen, {type ReactionsProps} from '@screens/reactions';

export default function ReactionsRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<ReactionsProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'post.reactions.title', defaultMessage: 'Reactions'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);
    return <ReactionsScreen {...props}/>;
}
