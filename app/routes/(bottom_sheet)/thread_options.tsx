// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import ThreadOptionsScreen, {type ThreadOptionsProps} from '@screens/thread_options';

export default function ThreadOptionsRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<ThreadOptionsProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'thread.options.title', defaultMessage: 'Thread Actions'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);
    return <ThreadOptionsScreen {...props}/>;
}
