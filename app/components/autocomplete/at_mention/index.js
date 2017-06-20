// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';
import {autocompleteUsers} from 'mattermost-redux/actions/users';
import {getDefaultChannel} from 'mattermost-redux/selectors/entities/channels';
import {getProfilesInCurrentChannel, getProfilesNotInCurrentChannel} from 'mattermost-redux/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    const {currentChannelId} = state.entities.channels;

    let postDraft;
    if (ownProps.isSearch) {
        const searchDraft = state.views.channel.drafts[ownProps.rootId];
        if (searchDraft) {
            postDraft = searchDraft.draft;
        }
    } else if (ownProps.rootId.length) {
        const threadDraft = state.views.thread.drafts[ownProps.rootId];
        if (threadDraft) {
            postDraft = threadDraft.draft;
        }
    } else if (currentChannelId) {
        const channelDraft = state.views.channel.drafts[currentChannelId];
        if (channelDraft) {
            postDraft = channelDraft.draft;
        }
    }

    return {
        currentUserId: state.entities.users.currentUserId,
        currentChannelId,
        currentTeamId: state.entities.teams.currentTeamId,
        defaultChannel: getDefaultChannel(state),
        postDraft,
        autocompleteUsers: {
            inChannel: getProfilesInCurrentChannel(state),
            outChannel: getProfilesNotInCurrentChannel(state)
        },
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
