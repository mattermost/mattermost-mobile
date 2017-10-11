// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {autocompleteUsers} from 'mattermost-redux/actions/users';
import {getCurrentChannelId, getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {
    filterMembersInChannel,
    filterMembersNotInChannel,
    filterMembersInCurrentTeam,
    getMatchTermForAtMention
} from 'app/selectors/autocomplete';
import {getTheme} from 'app/selectors/preferences';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch, rootId} = ownProps;
    const currentChannelId = getCurrentChannelId(state);

    let postDraft = '';
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

    const value = postDraft.substring(0, cursorPosition);
    const matchTerm = getMatchTermForAtMention(value, isSearch);

    let teamMembers;
    let inChannel;
    let outChannel;
    if (isSearch) {
        teamMembers = filterMembersInCurrentTeam(state, matchTerm);
    } else {
        inChannel = filterMembersInChannel(state, matchTerm);
        outChannel = filterMembersNotInChannel(state, matchTerm);
    }

    return {
        currentChannelId,
        currentTeamId: getCurrentTeamId(state),
        defaultChannel: getDefaultChannel(state),
        postDraft,
        matchTerm,
        teamMembers,
        inChannel,
        outChannel,
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
