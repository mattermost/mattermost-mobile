// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import {getDrawerUnreadCount} from 'app/realm/selectors/channel';
import options from 'app/store/realm_options';

import ChannelDrawerButton from './channel_drawer_button';

function mapPropsToQueries(realm) {
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const teamMembers = realm.objects('TeamMember').filtered('id CONTAINS $0', general.currentUserId);
    const directChannels = realm.objects('Channel').filtered('type = $0 OR type = $1', General.DM_CHANNEL, General.GM_CHANNEL);

    return [general, teamMembers, directChannels];
}

function mapQueriesToProps([general, teamMembers, directChannels]) {
    const unread = getDrawerUnreadCount(general.currentUserId, teamMembers, directChannels);

    return {
        mentions: unread.mentions,
        messages: unread.messages,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(ChannelDrawerButton);
