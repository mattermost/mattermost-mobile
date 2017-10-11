// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    filterMyChannels,
    filterOtherChannels,
    filterPublicChannels,
    filterPrivateChannels,
    getMatchTermForChannelMention
} from 'app/selectors/autocomplete';
import {getTheme} from 'app/selectors/preferences';

import ChannelMention from './channel_mention';

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch, rootId} = ownProps;
    const currentChannelId = getCurrentChannelId(state);

    let postDraft = '';
    if (isSearch) {
        postDraft = state.views.search;
    } else if (rootId) {
        const threadDraft = state.views.thread.drafts[rootId];
        if (threadDraft) {
            postDraft = threadDraft.draft;
        }
    } else if (currentChannelId) {
        const channelDraft = state.views.channel.drafts[currentChannelId];
        if (channelDraft) {
            postDraft = channelDraft.draft;
        }
    }

    const value = postDraft.substring(0, cursorPosition);
    const matchTerm = getMatchTermForChannelMention(value, isSearch);

    let myChannels;
    let otherChannels;
    let publicChannels;
    let privateChannels;
    if (isSearch) {
        publicChannels = filterPublicChannels(state, matchTerm);
        privateChannels = filterPrivateChannels(state, matchTerm);
    } else {
        myChannels = filterMyChannels(state, matchTerm);
        otherChannels = filterOtherChannels(state, matchTerm);
    }

    return {
        ...ownProps,
        myChannels,
        otherChannels,
        publicChannels,
        privateChannels,
        currentTeamId: getCurrentTeamId(state),
        matchTerm,
        postDraft,
        requestStatus: state.requests.channels.getChannels.status,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            searchChannels
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelMention);
