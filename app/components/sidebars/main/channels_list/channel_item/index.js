// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {realmConnect} from 'realm-react-redux';

import {General} from 'app/constants';
import {getDraftForChannel} from 'app/selectors/views';
import {reduxStore} from 'app/store';
import options from 'app/store/realm_options';

import ChannelItem from './channel_item';

function mapPropsToQueries(realm, ownProps) {
    const {channelId, fake} = ownProps;
    const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
    const currentUser = realm.objectForPrimaryKey('User', general.currentUserId);

    let channel;
    if (fake) {
        // If the channel is fake it means that is a user without a DM channel
        channel = realm.objectForPrimaryKey('User', channelId) || General.REALM_EMPTY_OBJECT;
    } else {
        channel = realm.objectForPrimaryKey('Channel', channelId) || General.REALM_EMPTY_OBJECT;
    }

    return [general, channel, currentUser];
}

function mapQueriesToProps([general, realmChannel, currentUser]) {
    let channel = null;
    if (realmChannel.id) {
        channel = realmChannel;
    }

    const reduxState = reduxStore.getState();
    const channelDraft = getDraftForChannel(reduxState, channel?.id);

    return {
        channel,
        currentChannelId: general.currentChannelId,
        currentUserId: general.currentUserId,
        hasDraft: Boolean(channelDraft.draft.trim() || channelDraft.files.length),
        locale: currentUser?.locale,
        experimentalHideTownSquare: general.config?.ExperimentalHideTownSquareinLHS,
    };
}

export default realmConnect(mapPropsToQueries, mapQueriesToProps, null, null, options)(ChannelItem);
