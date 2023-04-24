// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, RefreshControl, type StyleProp, type ViewStyle} from 'react-native';

type Props = {
    children: React.ReactElement;
    enabled: boolean;
    onRefresh: () => void;
    refreshing: boolean;
    style?: StyleProp<ViewStyle>;
}

const PostListRefreshControl = ({children, enabled, onRefresh, refreshing, style}: Props) => {
    const props = {
        onRefresh,
        refreshing,
    };

    if (Platform.OS === 'android') {
        return (
            <RefreshControl
                {...props}
                enabled={enabled}
                style={style}
            >
                {children}
            </RefreshControl>
        );
    }

    const refreshControl = <RefreshControl {...props}/>;

    return React.cloneElement(
        children,
        {refreshControl, inverted: true},
    );
};

export default PostListRefreshControl;
