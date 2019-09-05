// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {searchChannels, autocompleteChannelsForSearch} from 'mattermost-redux/actions/channels';
import {getMyChannelMemberships} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {isLandscape} from 'app/selectors/device';

import {
    filterMyChannels,
    filterOtherChannels,
    filterPublicChannels,
    filterPrivateChannels,
    filterDirectAndGroupMessages,
    getMatchTermForChannelMention,
} from 'app/selectors/autocomplete';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelMention from './channel_mention';

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch} = ownProps;

    const value = ownProps.value.substring(0, cursorPosition);
    const matchTerm = getMatchTermForChannelMention(value, isSearch);

    let myChannels;
    let otherChannels;
    let publicChannels;
    let privateChannels;
    let directAndGroupMessages;
    if (isSearch) {
        publicChannels = filterPublicChannels(state, matchTerm);
        privateChannels = filterPrivateChannels(state, matchTerm);
        directAndGroupMessages = filterDirectAndGroupMessages(state, matchTerm);
    } else {
        myChannels = filterMyChannels(state, matchTerm);
        otherChannels = filterOtherChannels(state, matchTerm);
    }

    return {
        myChannels,
        myMembers: getMyChannelMemberships(state),
        otherChannels,
        publicChannels,
        privateChannels,
        directAndGroupMessages,
        currentTeamId: getCurrentTeamId(state),
        matchTerm,
        requestStatus: state.requests.channels.getChannels.status,
        theme: getTheme(state),
        serverVersion: state.entities.general.serverVersion,
        isLandscape: isLandscape(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            searchChannels,
            autocompleteChannelsForSearch,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMention);
