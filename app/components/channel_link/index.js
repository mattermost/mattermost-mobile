// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getChannelsNameMapInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';

import {handleSelectChannel, setChannelDisplayName} from 'app/actions/views/channel';

import ChannelLink from './channel_link';

function mapStateToProps(state) {
    return {
        channelsByName: getChannelsNameMapInCurrentTeam(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannel,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelLink);
