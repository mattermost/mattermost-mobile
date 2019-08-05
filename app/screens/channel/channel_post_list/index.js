// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {goToScreen} from 'app/actions/navigation';
import {General, Preferences} from 'app/constants';
import {recordLoadTime} from 'app/realm/actions/general';
import {loadMorePostsAbove, loadPostsWithRetry, loadThreadIfNeeded, refreshChannelWithRetry} from 'app/realm/actions/post';
import {getPostListIdsWithSeparators} from 'app/realm/selectors/post';
import ephemeralStore from 'app/store/ephemeral_store';
import options from 'app/store/realm_options';

import ChannelPostList from './channel_post_list';

function mapPropsToQueries(realm, ownProps) {
    const {channelId, currentUserId} = ownProps;
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

    const currentUser = realm.objectForPrimaryKey('User', currentUserId);
    const member = realm.objectForPrimaryKey('ChannelMember', `${channelId}-${currentUserId}`) || {addListener: () => null, removeListener: () => null};
    const posts = realm.objects('Post').filtered('channelId=$0 AND originalId=""', channelId);
    const postsInTime = realm.objects('PostsTimesInChannel').filtered('channelId=$0', channelId);
    const joinLeaveMessages = realm.objects('Preference').filtered('id=$0', `${Preferences.CATEGORY_ADVANCED_SETTINGS}-${Preferences.ADVANCED_FILTER_JOIN_LEAVE}`);

    return [general, currentUser, member, posts, postsInTime, joinLeaveMessages];
}

function mapQueriesToProps([general, currentUser, member, posts, postsInTime, joinLeaveMessages]) {
    const inTime = postsInTime[0];
    const isTimezoneEnabled = general.config?.ExperimentalTimezone === 'true';
    const showJoinLeave = joinLeaveMessages[0]?.value === 'true';
    const postOptions = {
        channelLastViewedAt: member.lastViewAt,
        currentUser,
        posts,
        inTime,
        indicateNewMessages: true,
        showJoinLeave,
        isTimezoneEnabled,
    };

    const postIds = getPostListIdsWithSeparators(postOptions);

    return {
        lastViewedAt: member.lastViewAt,
        loadMorePostsVisible: ephemeralStore.loadingPosts,
        postIds,
    };
}

const mapRealmDispatchToProps = {
    goToScreen,
    loadPostsWithRetry,
    loadThreadIfNeeded,
    loadMorePostsAbove,
    recordLoadTime,
    refreshChannelWithRetry,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(ChannelPostList);
