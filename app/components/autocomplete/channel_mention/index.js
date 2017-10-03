// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {searchChannels} from 'mattermost-redux/actions/channels';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import {
    filterMyChannels,
    filterOtherChannels,
    filterPublicChannels,
    filterPrivateChannels
} from 'app/selectors/autocomplete';
import {getTheme} from 'app/selectors/preferences';

import ChannelMention from './channel_mention';

const CHANNEL_MENTION_REGEX = /\B(~([^~\r\n]*))$/i;
const CHANNEL_SEARCH_REGEX = /\b(?:in|channel):\s*(\S*)$/i;

const myChannels = [];
const otherChannels = [];
const publicChannels = [];
const privateChannels = [];

const autocompleteChannels = {
    myChannels,
    otherChannels,
    publicChannels,
    privateChannels
};

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch, rootId} = ownProps;
    const currentChannelId = getCurrentChannelId(state);
    const regex = isSearch ? CHANNEL_SEARCH_REGEX : CHANNEL_MENTION_REGEX;

    let postDraft;
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

    const match = postDraft.substring(0, cursorPosition).match(regex);
    let matchTerm = null;
    if (match) {
        matchTerm = isSearch ? match[1] : match[2];
    }

    const opts = {
        matchTerm,
        isSearch
    };

    if (isSearch) {
        filterPublicChannels(state, {...opts, array: publicChannels});
        filterPrivateChannels(state, {...opts, array: privateChannels});
    } else {
        filterMyChannels(state, {...opts, array: myChannels});
        filterOtherChannels(state, {...opts, array: otherChannels});
    }

    return {
        ...ownProps,
        autocompleteChannels,
        currentTeamId: state.entities.teams.currentTeamId,
        hasMatch: match !== null,
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
