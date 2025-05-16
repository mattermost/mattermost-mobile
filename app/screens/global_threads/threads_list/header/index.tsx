// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo, type ComponentProps} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity, View} from 'react-native';

import {updateTeamThreadsAsRead} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import Tabs from '@hooks/use_tabs/tabs';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export type Props = {
    tabsProps: ComponentProps<typeof Tabs>;
    teamId: string;
    testID: string;
    hasUnreads: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
            flexDirection: 'row',
        },
        markAllReadIconContainer: {
            paddingHorizontal: 20,
        },
        markAllReadIcon: {
            fontSize: 28,
            lineHeight: 28,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        markAllReadIconDisabled: {
            opacity: 0.5,
        },
    };
});

const Header = ({tabsProps, teamId, testID, hasUnreads}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const handleMarkAllAsRead = usePreventDoubleTap(useCallback(() => {
        Alert.alert(
            intl.formatMessage({
                id: 'global_threads.markAllRead.title',
                defaultMessage: 'Are you sure you want to mark all threads as read?',
            }),
            intl.formatMessage({
                id: 'global_threads.markAllRead.message',
                defaultMessage: 'This will clear any unread status for all of your threads shown here',
            }),
            [{
                text: intl.formatMessage({
                    id: 'global_threads.markAllRead.cancel',
                    defaultMessage: 'Cancel',
                }),
                style: 'cancel',
            }, {
                text: intl.formatMessage({
                    id: 'global_threads.markAllRead.markRead',
                    defaultMessage: 'Mark read',
                }),
                style: 'default',
                onPress: () => {
                    updateTeamThreadsAsRead(serverUrl, teamId);
                },
            }],
        );
    }, [intl, serverUrl, teamId]));

    const markAllStyle = useMemo(() => [
        styles.markAllReadIcon,
        hasUnreads ? undefined : styles.markAllReadIconDisabled,
    ], [styles, hasUnreads]);

    return (
        <View style={styles.container}>
            <Tabs {...tabsProps}/>
            <View style={styles.markAllReadIconContainer}>
                <TouchableOpacity
                    disabled={!hasUnreads}
                    onPress={handleMarkAllAsRead}
                    testID={`${testID}.mark_all_as_read.button`}
                >
                    <CompassIcon
                        name='playlist-check'
                        style={markAllStyle}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Header;
