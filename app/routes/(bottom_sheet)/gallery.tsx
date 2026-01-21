// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';

import {usePropsFromParams} from '@hooks/props_from_params';
import GalleryScreen, {type GalleryProps} from '@screens/gallery';

export default function GalleryRoute() {
    const navigation = useNavigation();
    const props = usePropsFromParams<GalleryProps>();

    useEffect(() => {
        navigation.setOptions({
            animation: 'none',
            presentation: 'transparentModal',
            contentStyle: {backgroundColor: 'transparent'},
            headerShown: false,
            gestureEnabled: false,
        });
    }, [navigation]);

    return <GalleryScreen {...props}/>;
}
