// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {Text, FlatList, View, TouchableOpacity} from 'react-native';
import type {Theme} from '@mm-redux/types/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import CompassIcon from '@components/compass_icon';
import ThreadItem from '@components/thread_item';

// import {getPost, makeGetCommentCountForPost, makeIsPostCommentMention} from '@mm-redux/selectors/entities/posts';
import {getThreadOrderInCurrentTeam, getUnreadThreadOrderInCurrentTeam} from '@mm-redux/selectors/entities/threads';
import type {GlobalState} from '@mm-redux/types/store';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {useSelector, useDispatch} from 'react-redux';
import {getViewingGlobalThreadsUnread} from '@selectors/threads';
import {handleViewingGlobalThreadsAll, handleViewingGlobalThreadsUnreads} from '@actions/views/threads';

import EmptyState from './empty_state';

const GlobalThreads = () => {
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const threadIds = useSelector((state: GlobalState) => getThreadOrderInCurrentTeam(state));
    const unreadThreadIds = useSelector((state: GlobalState) => getUnreadThreadOrderInCurrentTeam(state));
    const viewingUnreads = useSelector((state: GlobalState) => getViewingGlobalThreadsUnread(state));
    const haveUnreads = unreadThreadIds.length > 0;

    let ids = threadIds;
    if (viewingUnreads) {
        ids = unreadThreadIds;
    }

    const dispatch = useDispatch();

    const handleViewingAllThreads = () => {
        dispatch(handleViewingGlobalThreadsAll());
    };

    const handleViewingUnreadThreads = () => {
        dispatch(handleViewingGlobalThreadsUnreads());
    };

    const style = getStyleSheet(theme);

    const keyExtractor = React.useCallback((item) => item, []);

    const renderPost = React.useCallback(({item}) => {
        return (
            <ThreadItem
                postId={item}
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
                    <TouchableOpacity onPress={handleViewingAllThreads}>
                        <View style={[style.menuItemContainer, viewingUnreads ? undefined : style.menuItemContainerSelected]}>
                            <Text style={[style.menuItem, viewingUnreads ? {} : style.menuItemSelected]}>{'All Your Threads'}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleViewingUnreadThreads}>
                        <View style={[style.menuItemContainer, viewingUnreads ? style.menuItemContainerSelected : undefined]}>
                            <View>
                                <Text style={[style.menuItem, viewingUnreads ? style.menuItemSelected : {}]}>{'Unreads'}</Text>
                                {haveUnreads ? <View style={style.unreadsDot}/> : null}
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={style.markAllReadIconContainer}>
                    <TouchableOpacity>
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
                data={ids}
                renderItem={renderPost}
                keyExtractor={keyExtractor}
                contentContainerStyle={style.messagesContainer}
                ListEmptyComponent={
                    <EmptyState isUnreads={viewingUnreads}/>
                }
            />
        </View>
    );
};

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

export default GlobalThreads;
