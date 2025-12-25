// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';
import {useIntl} from 'react-intl';

import {useIsTablet} from '@hooks/device';
import {usePropsFromParams} from '@hooks/props_from_params';
import PostOptions, {type PostOptionsProps} from '@screens/post_options';

export default function PostOptionsRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<PostOptionsProps>();
    const isTablet = useIsTablet();
    const intl = useIntl();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            headerOptions: {
                headerTitle: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                headerShown: isTablet,
            },
        });
    }, [intl, isTablet, navigation]);
    return <PostOptions {...props}/>;
}
