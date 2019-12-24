// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General, Preferences} from 'app/constants';

//import {getChannelStats, loadChannelsForTeam, loadSidebarDirectMessagesProfiles, selectInitialChannel} from 'app/realm/actions/channel';
//import {loadPostsIfNecessaryWithRetry, markChannelViewedAndRead} from 'app/actions/views/channel';
//import {getPostIdsInChannel} from 'mattermost-redux/selectors/entities/posts';
//import {getMyChannelMember} from 'mattermost-redux/selectors/entities/channels';
import {getTheme} from 'app/realm/selectors/preference';
import options from 'app/store/realm_options';

import ChannelPeek from './channel_peek';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID) || General.REALM_EMPTY_OBJECT;
    const themePreferences = realm.objects('Preference').filtered(`category="${Preferences.CATEGORY_THEME}"`);
    const currentUser = realm.objectForPrimaryKey('User', general?.currentUserId || '') || General.REALM_EMPTY_OBJECT;
    return [currentUser, general, themePreferences];
}

function mapQueriesToProps([currentUser, general, themePreferences]) {
    //const myMember = getMyChannelMember(state, channelId);
    return {
        channelId: general?.currentChannelId,
        currentUserId: currentUser?.id,
        //postIds: getPostIdsInChannel(state, channelId),
        //lastViewedAt: myMember && myMember.last_viewed_at,
        theme: getTheme([general], themePreferences),
    };
}

const mapRealmDispatchToProps = {
    loadPostsIfNecessaryWithRetry,
    markChannelViewedAndRead,
};

export default realmConnect(mapPropsToQueries, mapQueriesToProps, mapRealmDispatchToProps, null, options)(ChannelPeek);