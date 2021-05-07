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

    // TODO
    // Show messages - with Memo
    const renderPost = ({item}: {item: string, index:number}) => {
        return (
            <ThreadItem
                postId={item}
            />
        );
    };

    const dispatch = useDispatch();

    const handleViewingAllThreads = () => {
        dispatch(handleViewingGlobalThreadsAll());
    };

    const handleViewingUnreadThreads = () => {
        dispatch(handleViewingGlobalThreadsUnreads());
    };

    const style = getStyleSheet(theme);

    let unreadsDot;
    if (haveUnreads) {
        unreadsDot = (<View style={style.unreadsDot}/>);
    }

    return (

        <View>
            <View style={[{height: 64, flexDirection: 'row'}, style.borderBottom]}>
                <View style={[style.allYourThreadsContainer]}>
                    <TouchableOpacity onPress={handleViewingAllThreads}>
                        <View style={[style.allYouThreadsPadding, viewingUnreads ? {} : style.selectedContainer]}>
                            <Text style={[style.allYourThreadsText, viewingUnreads ? {} : style.selectedText]}>{'All Your Threads'}</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={[style.unreadsContainer]}>
                    <TouchableOpacity onPress={handleViewingUnreadThreads}>
                        <View style={[{flexDirection: 'row'}, style.unreadsPadding, viewingUnreads ? style.selectedContainer : {}]}>
                            <Text style={[style.unreadsText, viewingUnreads ? style.selectedText : {}]}>{'Unreads'}</Text>
                            {unreadsDot}
                        </View>
                    </TouchableOpacity>
                </View>

                <View style={style.markAllReadIconContainer}>
                    <TouchableOpacity >
                        <CompassIcon
                            name='playlist-check'
                            style={style.markAllReadIcon}
                        />
                    </TouchableOpacity>
                </View>

            </View>

            <FlatList
                data={ids}
                renderItem={renderPost}
                keyExtractor={(item) => {
                    return item;
                }}
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
        selectedContainer: {
            backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        },
        selectedText: {
            color: theme.buttonBg,
        },
        allYourThreadsContainer: {
            alignSelf: 'center',
            flex: 4.5,
        },
        allYouThreadsPadding: {
            paddingTop: 8,
            paddingBottom: 8,
            marginLeft: 16,
            paddingRight: 16,
        },
        allYourThreadsText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            alignSelf: 'center',
            fontFamily: 'Open Sans',
            fontWeight: '600',
            fontSize: 16,
            lineHeight: 24,
        },
        unreadsContainer: {
            flexDirection: 'row',
            alignSelf: 'center',
            flex: 4.5,
        },
        unreadsPadding: {
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 16,
            paddingRight: 16,
        },
        unreadsText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            alignSelf: 'flex-start',
            fontFamily: 'Open Sans',
            fontWeight: '600',
            fontSize: 16,
            lineHeight: 24,
            textAlign: 'center',
        },
        unreadsDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.sidebarTextActiveBorder,
            marginTop: 5,
            marginLeft: 3,
        },
        markAllReadIconContainer: {
            flex: 1,
            alignSelf: 'center',
        },
        markAllReadIcon: {
            fontSize: 28,
            lineHeight: 28,
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});

export default GlobalThreads;
