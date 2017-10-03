// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {autocompleteUsers} from 'mattermost-redux/actions/users';
import {getCurrentChannelId, getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {
    filterMembersInChannel,
    filterMembersNotInChannel,
    filterMembersInCurrentTeam
} from 'app/selectors/autocomplete';
import {getTheme} from 'app/selectors/preferences';

import AtMention from './at_mention';

const AT_MENTION_REGEX = /\B(@([^@\r\n\s]*))$/i;
const FROM_REGEX = /\bfrom:\s*(\S*)$/i;

const inChannel = [];
const outChannel = [];
const teamMembers = [];

const autocompleteProfiles = {
    inChannel,
    outChannel,
    teamMembers
};

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch, rootId} = ownProps;
    const currentChannelId = getCurrentChannelId(state);
    const currentUserId = getCurrentUserId(state);
    const regex = isSearch ? FROM_REGEX : AT_MENTION_REGEX;

    let postDraft;
    if (isSearch) {
        postDraft = state.views.search;
    } else if (ownProps.rootId) {
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
        currentUserId,
        isSearch
    };

    if (isSearch) {
        filterMembersInCurrentTeam(state, {...opts, array: teamMembers});
    } else {
        filterMembersInChannel(state, {...opts, array: inChannel});
        filterMembersNotInChannel(state, {...opts, array: outChannel});
    }

    return {
        currentUserId,
        currentChannelId: isSearch ? '' : currentChannelId,
        currentTeamId: state.entities.teams.currentTeamId,
        defaultChannel: getDefaultChannel(state),
        hasMatch: match !== null,
        matchTerm,
        postDraft,
        autocompleteUsers: autocompleteProfiles,
        requestStatus: state.requests.users.autocompleteUsers.status,
        theme: getTheme(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            autocompleteUsers
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AtMention);
