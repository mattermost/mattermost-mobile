// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {selectPost} from '@mm-redux/actions/posts';
import {getChannel, getCurrentChannelId, getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {makeGetPostIdsForThread} from '@mm-redux/selectors/entities/posts';

import Thread from './thread';
import {getAppsBindings} from '@mm-redux/selectors/entities/apps';
import {AppBindingLocations} from '@mm-redux/constants/apps';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThread();
    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, ownProps.channelId);

        let postBindings = null;
        if (ownProps.channelId === getCurrentChannelId(state)) {
            postBindings = getAppsBindings(state, AppBindingLocations.POST_MENU_ITEM);
        }
        return {
            channelId: ownProps.channelId,
            channelType: channel ? channel.type : '',
            displayName: channel ? channel.display_name : '',
            myMember: getMyCurrentChannelMembership(state),
            rootId: ownProps.rootId,
            postIds: getPostIdsForThread(state, ownProps.rootId),
            theme: getTheme(state),
            channelIsArchived: channel ? channel.delete_at !== 0 : false,
            threadLoadingStatus: state.requests.posts.getPostThread,
            postBindings,
            teamId: channel.team_id || getCurrentTeamId(state),
            userId: getCurrentUserId(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Thread);
