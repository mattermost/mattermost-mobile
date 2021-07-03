// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {FlatList, Text, TouchableOpacity, View} from 'react-native';
import {intlShape} from 'react-intl';
import {useSelector} from 'react-redux';

import CompassIcon from '@components/compass_icon';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import type {Theme} from '@mm-redux/types/preferences';
import type {GlobalState} from '@mm-redux/types/store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from '../empty_state';
import ThreadItem from '../thread_item';

type Props = {
    haveUnreads: boolean;
    intl: typeof intlShape;
    markAllAsRead: () => void;
    testID: string;
    threadIds: string[];
    viewAllThreads: () => void;
    viewUnreadThreads: () => void;
    viewingUnreads: boolean;
}

function ThreadList({haveUnreads, intl, markAllAsRead, testID, threadIds, viewAllThreads, viewUnreadThreads, viewingUnreads}: Props) {
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const style = getStyleSheet(theme);

    const keyExtractor = React.useCallback((item) => item, []);

    const renderPost = React.useCallback(({item}) => {
        return (
            <ThreadItem
                postId={item}
                testID={testID}
            />
        );
    }, []);

    const renderHeader = () => {
        if (!threadIds.length) {
            return null;
        }
        return (
            <View style={[style.headerContainer, style.borderBottom]}>
                <View style={style.menuContainer}>
                    <TouchableOpacity
                        onPress={viewAllThreads}
                        testID={`${testID}.all_threads`}
                    >
                        <View style={[style.menuItemContainer, viewingUnreads ? undefined : style.menuItemContainerSelected]}>
                            <Text style={[style.menuItem, viewingUnreads ? {} : style.menuItemSelected]}>
                                {
                                    intl.formatMessage({
                                        id: 'global_threads.allThreads',
                                        defaultMessage: 'All Your Threads',
                                    })
                                }
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={viewUnreadThreads}
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
                                {haveUnreads ? (
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
                        disabled={!haveUnreads}
                        onPress={markAllAsRead}
                        testID={`${testID}.mark_all_read`}
                    >
                        <CompassIcon
                            name='playlist-check'
                            style={style.markAllReadIcon}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={style.container}>
            {renderHeader()}
            <FlatList
                data={threadIds}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                contentContainerStyle={style.messagesContainer}
                ListEmptyComponent={
                    <EmptyState
                        intl={intl}
                        isUnreads={viewingUnreads}
                    />
                }
            />
        </View>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        borderBottom: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderBottomWidth: 1,
        },

        container: {
            flex: 1,
        },
        headerContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            height: 64,
        },

        menuContainer: {
            alignItems: 'center',
            flexGrow: 1,
            flexDirection: 'row',
        },
        menuItemContainer: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            marginLeft: 16,
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
        },

        markAllReadIconContainer: {
            paddingHorizontal: 20,
        },
        markAllReadIcon: {
            fontSize: 28,
            lineHeight: 28,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
        messagesContainer: {
            flexGrow: 1,
        },
    };
});

export default ThreadList;
