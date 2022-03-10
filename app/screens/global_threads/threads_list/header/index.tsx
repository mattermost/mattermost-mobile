// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, Text, TouchableOpacity, View} from 'react-native';

import {updateTeamThreadsAsRead} from '@actions/remote/thread';
import {changeOpacity} from '@app/utils/theme';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {makeStyleSheetFromTheme} from '@utils/theme';

export type Tab = 'all' | 'unreads';

export type Props = {
    setTab: (tab: Tab) => void;
    tab: Tab;
    teamId: string;
    testID: string;
    theme: Theme;
    unreadsCount: number;
};

const getStyle = makeStyleSheetFromTheme((theme) => {
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
    const style = getStyle(theme);
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

    return (
        <View style={style.container}>
            <View style={style.menuContainer}>
                <TouchableOpacity
                    onPress={() => setTab('all')}
                    testID={`${testID}.all_threads`}
                >
                    <View style={[style.menuItemContainer, viewingUnreads ? undefined : style.menuItemContainerSelected]}>
                        <Text style={[style.menuItem, viewingUnreads ? {} : style.menuItemSelected]}>
                            {
                                intl.formatMessage({
                                    id: 'global_threads.allThreads',
                                    defaultMessage: 'All your threads',
                                })
                            }
                        </Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setTab('unreads')}
                    testID={`${testID}.unread_threads`}
                >
                    <View style={[style.menuItemContainer, viewingUnreads ? style.menuItemContainerSelected : undefined]}>
                        <View>
                            <Text style={[style.menuItem, viewingUnreads ? style.menuItemSelected : {}]}>
                                {
                                    intl.formatMessage({
                                        id: 'global_threads.unreads',
                                        defaultMessage: 'Unreads',
                                    })
                                }
                            </Text>
                            {hasUnreads ? (
                                <View
                                    style={style.unreadsDot}
                                    testID={`${testID}.unreads_dot`}
                                />
                            ) : null}
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
            <View style={style.markAllReadIconContainer}>
                <TouchableOpacity
                    disabled={!hasUnreads}
                    onPress={handleMarkAllAsRead}
                    testID={`${testID}.mark_all_read`}
                >
                    <CompassIcon
                        name='playlist-check'
                        style={[style.markAllReadIcon, hasUnreads ? undefined : style.markAllReadIconDisabled]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default Header;
