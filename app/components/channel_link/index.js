// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {createSelector} from 'reselect';

import {joinChannel} from 'mattermost-redux/actions/channels';
import {getChannelsNameMapInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {handleSelectChannel} from 'app/actions/views/channel';

import ChannelLink from './channel_link';

function makeGetChannelNamesMap() {
    return createSelector(
        getChannelsNameMapInCurrentTeam,
        (state, props) => props && props.channelMentions,
        (channelsNameMap, channelMentions) => {
            if (channelMentions) {
                return Object.assign({}, channelMentions, channelsNameMap);
            }

            return channelsNameMap;
        }
    );
}

function makeMapStateToProps() {
    const getChannelNamesMap = makeGetChannelNamesMap();

    return function mapStateToProps(state, ownProps) {
        return {
            channelsByName: getChannelNamesMap(state, ownProps),
            currentTeamId: getCurrentTeamId(state),
            currentUserId: getCurrentUserId(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            joinChannel,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ChannelLink);
