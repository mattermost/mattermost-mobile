// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactElement} from 'react';
import {Platform, RefreshControl, StyleSheet} from 'react-native';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    children: ReactElement;
    enabled: boolean;
    isInverted?: boolean;
    onRefresh: () => void;
    refreshing: boolean;
    theme: Theme;
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    containerInverse: {
        scaleY: -1,
    },
});

const PostListRefreshControl = ({children, enabled, isInverted = true, onRefresh, refreshing, theme}: Props) => {
    const props = {
        colors: [theme.onlineIndicator, theme.awayIndicator, theme.dndIndicator],
        onRefresh,
        refreshing,
        tintColor: theme.centerChannelColor,
    };

    if (Platform.OS === 'android') {
        return (
            <RefreshControl
                {...props}
                enabled={enabled}
                style={[style.container, isInverted ? style.containerInverse : undefined]}
            >
                {children}
            </RefreshControl>
        );
    }

    const refreshControl = <RefreshControl {...props}/>;

    return React.cloneElement(
        children,
        {refreshControl, inverted: isInverted},
    );
};

export default PostListRefreshControl;
