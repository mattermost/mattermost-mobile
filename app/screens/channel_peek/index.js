// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';

import {markChannelsViewedAndRead} from 'app/realm/actions/channel';
import {loadPostsWithRetry} from 'app/realm/actions/post';
import {getPostListIdsWithSeparators} from 'app/realm/selectors/post';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import ChannelPeek from './channel_peek';

function mapPropsToQueries(realm, ownProps) {
    const {channelId, currentUserId} = ownProps;
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreferences = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);

    const currentUser = realm.objectForPrimaryKey('User', general?.currentUserId || '') || General.REALM_EMPTY_OBJECT;
    const member = realm.objectForPrimaryKey('ChannelMember', `${channelId}-${currentUserId}`) || {addListener: () => null, removeListener: () => null};
    const posts = realm.objects('Post').filtered('channelId=$0 AND originalId=""', channelId);
    const postsInTime = realm.objects('PostsTimesInChannel').filtered('channelId=$0', channelId);
    const joinLeaveMessages = realm.objects('Preference').filtered('id=$0', `${Preferences.CATEGORY_ADVANCED_SETTINGS}-${Preferences.ADVANCED_FILTER_JOIN_LEAVE}`);

    return [currentUser, general, joinLeaveMessages, member, posts, postsInTime, themePreferences];
}

function mapQueriesToProps([currentUser, general, joinLeaveMessages, member, posts, postsInTime, themePreferences]) {
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
        channelId: general?.currentChannelId,
        currentUserId: currentUser?.id,
        lastViewedAt: member.lastViewAt,
        postIds,
        theme: getTheme([general], themePreferences),
    };
}

const mapRealmDispatchToProps = {
    loadPostsWithRetry,
    markChannelsViewedAndRead,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(ChannelPeek);