// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {selectPost} from 'mattermost-redux/actions/posts';
import {makeGetChannel, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';
import {makeGetPostIdsForThread} from 'mattermost-redux/selectors/entities/posts';

import Thread from './thread';

function makeMapStateToProps() {
    const getPostIdsForThread = makeGetPostIdsForThread();
    const getChannel = makeGetChannel();

    return function mapStateToProps(state, ownProps) {
        const channel = getChannel(state, {id: ownProps.channelId});

        return {
            channelId: ownProps.channelId,
            channelType: channel ? channel.type : '',
            displayName: channel ? channel.display_name : '',
            myMember: getMyCurrentChannelMembership(state),
            rootId: ownProps.rootId,
            postIds: getPostIdsForThread(state, ownProps.rootId),
            theme: getTheme(state),
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
