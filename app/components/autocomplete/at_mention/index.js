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
    if (ownProps.rootId.length) {
        postDraft = state.views.thread.drafts[ownProps.rootId].draft;
    } else if (currentChannelId) {
        postDraft = state.views.channel.drafts[currentChannelId].draft;
    }

    return {
        ...ownProps,
        currentUserId: state.entities.users.currentUserId,
        currentChannelId,
        currentTeamId: state.entities.teams.currentTeamId,
        defaultChannel: getDefaultChannel(state),
        postDraft,
        autocompleteUsersInCurrentChannel: {
            inChannel: getProfilesInCurrentChannel(state),
            outChannel: getProfilesNotInCurrentChannel(state)
        },
        requestStatus: state.requests.users.autocompleteUsers.status,
        theme: getTheme(state)
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
