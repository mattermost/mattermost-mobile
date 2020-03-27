// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {isMinimumServerVersion} from '@redux/utils/helpers';
import {autocompleteUsers} from '@redux/actions/users';
import {getCurrentChannelId, getDefaultChannel} from '@redux/selectors/entities/channels';
import {getCurrentTeamId} from '@redux/selectors/entities/teams';
import {isLandscape} from 'app/selectors/device';

import {
    filterMembersInChannel,
    filterMembersNotInChannel,
    filterMembersInCurrentTeam,
    getMatchTermForAtMention,
} from 'app/selectors/autocomplete';
import {getTheme} from '@redux/selectors/entities/preferences';

import {haveIChannelPermission} from '@redux/selectors/entities/roles';
import {Permissions} from '@redux/constants';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    const {cursorPosition, isSearch} = ownProps;
    const currentChannelId = getCurrentChannelId(state);

    let useChannelMentions = true;
    if (isMinimumServerVersion(state.entities.general.serverVersion, 5, 22)) {
        useChannelMentions = haveIChannelPermission(
            state,
            {
                channel: currentChannelId,
                permission: Permissions.USE_CHANNEL_MENTIONS,
            },
        );
    }

    const value = ownProps.value.substring(0, cursorPosition);
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
        matchTerm,
        teamMembers,
        inChannel,
        outChannel,
        requestStatus: state.requests.users.autocompleteUsers.status,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
        useChannelMentions,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            autocompleteUsers,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(AtMention);
