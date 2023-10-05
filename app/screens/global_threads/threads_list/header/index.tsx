// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity, View} from 'react-native';

import {updateTeamThreadsAsRead} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type Props = {
    setTab: (tab: GlobalThreadsTab) => void;
    tab: GlobalThreadsTab;
    teamId: string;
    testID: string;
    unreadsCount: number;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            alignItems: 'center',
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
            flexDirection: 'row',
        },
        menuContainer: {
            alignItems: 'center',
            flexGrow: 1,
            flexDirection: 'row',
            paddingLeft: 12,
            marginVertical: 12,
            flex: 1,
            overflow: 'hidden',
        },
        menuItemContainer: {
            paddingVertical: 8,
            paddingHorizontal: 16,
        },
        menuItemContainerSelected: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
            borderRadius: 4,
        },
        menuItem: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            alignSelf: 'center',
            ...typography('Body', 200, 'SemiBold'),
        },
        menuItemSelected: {
            color: theme.buttonBg,
        },
        unreadsDot: {
            position: 'absolute',
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.sidebarTextActiveBorder,
            right: -6,
            top: 4,
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

const Header = ({setTab, tab, teamId, testID, unreadsCount}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const hasUnreads = unreadsCount > 0;
    const viewingUnreads = tab === 'unreads';

    const handleMarkAllAsRead = useCallback(preventDoubleTap(() => {
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
    }), [intl, serverUrl, teamId]);

    const handleViewAllThreads = useCallback(preventDoubleTap(() => setTab('all')), []);
    const handleViewUnreadThreads = useCallback(preventDoubleTap(() => setTab('unreads')), []);

    const {allThreadsContainerStyle, allThreadsStyle, unreadsContainerStyle, unreadsStyle} = useMemo(() => {
        return {
            allThreadsContainerStyle: [
                styles.menuItemContainer,
                viewingUnreads ? undefined : styles.menuItemContainerSelected,
            ],
            allThreadsStyle: [
                styles.menuItem,
                viewingUnreads ? undefined : styles.menuItemSelected,
            ],
            unreadsContainerStyle: [
                styles.menuItemContainer,
                viewingUnreads ? styles.menuItemContainerSelected : undefined,
            ],
            unreadsStyle: [
                styles.menuItem,
                viewingUnreads ? styles.menuItemSelected : undefined,
            ],
        };
    }, [styles, viewingUnreads]);

    const markAllStyle = useMemo(() => [
        styles.markAllReadIcon,
        hasUnreads ? undefined : styles.markAllReadIconDisabled,
    ], [styles, hasUnreads]);

    return (
        <View style={styles.container}>
            <View style={styles.menuContainer}>
                <TouchableOpacity
                    onPress={handleViewAllThreads}
                    testID={`${testID}.all_threads.button`}
                >
                    <View style={allThreadsContainerStyle}>
                        <FormattedText
                            id='global_threads.allThreads'
                            defaultMessage='All your threads'
                            style={allThreadsStyle}
                        />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={handleViewUnreadThreads}
                    testID={`${testID}.unread_threads.button`}
                >
                    <View style={unreadsContainerStyle}>
                        <View>
                            <FormattedText
                                id='global_threads.unreads'
                                defaultMessage='Unreads'
                                style={unreadsStyle}
                            />
                            {hasUnreads ? (
                                <View
                                    style={styles.unreadsDot}
                                    testID={`${testID}.unreads_dot.badge`}
                                />
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
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
