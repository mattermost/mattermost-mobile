// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';
import React from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity, View} from 'react-native';

import {showUnreadChannelsOnly} from '@actions/local/channel';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const isEncmaApp = applicationId === 'com.encma.hxmain';

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
    encmaContainer: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.1),
        borderColor: changeOpacity(theme.sidebarText, 0.08),
        borderRadius: 14,
        borderWidth: 1,
    },
    filtered: {
        backgroundColor: theme.sidebarText,
    },
}));

const UnreadFilter = ({onlyUnreads}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);
    const accessibilityProps = isEncmaApp ? {
        accessibilityLabel: intl.formatMessage(onlyUnreads ? {
            id: 'channel_list.unread_filter.show_all',
            defaultMessage: 'Show all channels',
        } : {
            id: 'channel_list.unread_filter.only_unreads',
            defaultMessage: 'Show unread channels only',
        }),
        accessibilityRole: 'button' as const,
        accessibilityState: {selected: onlyUnreads},
    } : {};

    const onPress = () => {
        showUnreadChannelsOnly(serverUrl, !onlyUnreads);
    };

    return (
        <TouchableOpacity
            {...accessibilityProps}
            onPress={onPress}
            testID='channel_list_subheader.unread_filter.button'
        >
            <View
                style={[styles.container, isEncmaApp && styles.encmaContainer, onlyUnreads && styles.filtered]}
                testID='channel_list_subheader.unread_filter.surface'
            >
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
