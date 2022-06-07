// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity, View} from 'react-native';

import {showUnreadChannelsOnly} from '@actions/local/channel';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    onlyUnreads: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        height: 40,
        justifyContent: 'center',
        marginVertical: 20,
        width: 40,
    },
    filtered: {
        backgroundColor: theme.sidebarText,
    },
}));

const UnreadFilter = ({onlyUnreads}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const onPress = () => {
        showUnreadChannelsOnly(serverUrl, !onlyUnreads);
    };

    return (
        <TouchableOpacity onPress={onPress}>
            <View style={[styles.container, onlyUnreads && styles.filtered]}>
                <CompassIcon
                    color={changeOpacity(onlyUnreads ? theme.sidebarBg : theme.sidebarText, 0.56)}
                    name='filter-variant'
                    size={24}
                />
            </View>
        </TouchableOpacity>
    );
};

export default UnreadFilter;
