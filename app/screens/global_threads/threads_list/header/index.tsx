// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity, View} from 'react-native';

import {updateTeamThreadsAsRead} from '@actions/remote/thread';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export type Tab = 'all' | 'unreads';

export type Props = {
    setTab: (tab: Tab) => void;
    tab: Tab;
    teamId: string;
    testID: string;
    theme: Theme;
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
            fontFamily: 'Open Sans',
            fontWeight: '600',
            fontSize: 16,
            lineHeight: 24,
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

const Header = ({setTab, tab, teamId, testID, theme, unreadsCount}: Props) => {
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const hasUnreads = unreadsCount > 0;
    const viewingUnreads = tab === 'unreads';

    const handleMarkAllAsRead = () => {
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
    };

    const testIDPrefix = `${testID}.header`;

    return (
        <View style={styles.container}>
            <View style={styles.menuContainer}>
                <TouchableOpacity
                    onPress={() => setTab('all')}
                    testID={`${testIDPrefix}.all_threads`}
                >
                    <View style={[styles.menuItemContainer, viewingUnreads ? undefined : styles.menuItemContainerSelected]}>
                        <FormattedText
                            id='global_threads.allThreads'
                            defaultMessage='All your threads'
                            style={[styles.menuItem, viewingUnreads ? {} : styles.menuItemSelected]}
                        />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab('unreads')}
                    testID={`${testIDPrefix}.unread_threads`}
                >
                    <View style={[styles.menuItemContainer, viewingUnreads ? styles.menuItemContainerSelected : undefined]}>
                        <View>
                            <FormattedText
                                id='global_threads.unreads'
                                defaultMessage='Unreads'
                                style={[styles.menuItem, viewingUnreads ? styles.menuItemSelected : {}]}
                            />
                            {hasUnreads ? (
                                <View
                                    style={styles.unreadsDot}
                                    testID={`${testIDPrefix}.unreads_dot`}
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
                    testID={`${testIDPrefix}.mark_all_read`}
                >
                    <CompassIcon
                        name='playlist-check'
                        style={[styles.markAllReadIcon, hasUnreads ? undefined : styles.markAllReadIconDisabled]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Header;
