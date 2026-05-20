// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';

import {usePropsFromParams} from '@hooks/props_from_params';
import PermalinkScreen, {type PermalinkProps} from '@screens/permalink';

export default function PermalinkRoute() {
    const props = usePropsFromParams<PermalinkProps>();
    const navigation = useNavigation();

    useEffect(() => {
        navigation.setOptions({
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: {backgroundColor: 'transparent'},
        });
    }, [navigation]);

    return (<PermalinkScreen {...props}/>);
}
