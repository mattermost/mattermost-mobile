// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import withObservables from '@nozbe/with-observables';
import React, {useEffect} from 'react';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {withServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import EphemeralStore from '@store/ephemeral_store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        height: 14,
        borderRadius: 7,
        borderBottomColor: changeOpacity(theme.sidebarText, 0.16),
        borderLeftColor: theme.sidebarText,
        borderRightColor: changeOpacity(theme.sidebarText, 0.16),
        borderTopColor: changeOpacity(theme.sidebarText, 0.16),
        borderWidth: 2,
        marginLeft: 5,
        width: 14,
    },
}));

type Props = {
    loading: boolean;
}

const LoadingUnreads = ({loading}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const opacity = useSharedValue(1);
    const rotation = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{
            rotateZ: `${rotation.value}deg`,
        }],
    }), [loading]);

    useEffect(() => {
        if (loading) {
            opacity.value = 1;
            rotation.value = withRepeat(withTiming(360, {duration: 750, easing: Easing.ease}), -1);
        } else {
            opacity.value = withTiming(0, {duration: 300, easing: Easing.ease});
            cancelAnimation(rotation);
        }

        return () => {
            cancelAnimation(opacity);
            cancelAnimation(rotation);
        };
    }, [loading]);

    if (!loading) {
        return null;
    }

    return <Animated.View style={[style.container, animatedStyle]}/>;
};

const enhanced = withObservables(['serverUrl'], ({serverUrl}: {serverUrl: string}) => ({
    loading: EphemeralStore.observeLoadingTeamChannels(serverUrl),
}));

export default withServerUrl(enhanced(LoadingUnreads));
