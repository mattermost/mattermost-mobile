// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import ServersListScreen, {type ServersListProps} from '@screens/servers_list';

export default function ServersListRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<ServersListProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'your.servers', defaultMessage: 'Your servers'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);

    return (<ServersListScreen serverIds={props.serverIds}/>);
}
