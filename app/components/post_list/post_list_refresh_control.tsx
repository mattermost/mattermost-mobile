// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactElement} from 'react';
import {Platform, RefreshControl, StyleSheet} from 'react-native';

import type {Theme} from '@mm-redux/types/preferences';

type Props = {
    children: ReactElement;
    enabled: boolean;
    onRefresh: () => void;
    refreshing: boolean;
    theme: Theme;
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        scaleY: -1,
    },
});

const PostListRefreshControl = ({children, enabled, onRefresh, refreshing, theme}: Props) => {
    if (Platform.OS === 'android') {
        return (
            <RefreshControl
                enabled={enabled}
                refreshing={refreshing}
                colors={[theme.onlineIndicator, theme.awayIndicator, theme.dndIndicator]}
                tintColor={theme.centerChannelColor}
                onRefresh={onRefresh}
                style={style.container}
            >
                {children}
            </RefreshControl>
        );
    }

    const refreshControl = (
        <RefreshControl
            refreshing={refreshing}
            colors={[theme.onlineIndicator, theme.awayIndicator, theme.dndIndicator]}
            tintColor={theme.centerChannelColor}
            onRefresh={onRefresh}
        />
    );

    return React.cloneElement(
        children,
        {refreshControl, inverted: true},
    );
};

export default PostListRefreshControl;
