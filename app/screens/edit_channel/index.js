// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamUrl} from 'mattermost-redux/selectors/entities/teams';
import {patchChannel} from 'mattermost-redux/actions/channels';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {setChannelDisplayName} from 'app/actions/views/channel';
import {getDimensions} from 'app/selectors/device';

import EditChannel from './edit_channel';

function mapStateToProps(state) {
    const {updateChannel: updateChannelRequest} = state.requests.channels;
    const channel = getCurrentChannel(state);
    const {deviceWidth, deviceHeight} = getDimensions(state);

    return {
        channel,
        currentTeamUrl: getCurrentTeamUrl(state),
        updateChannelRequest,
        theme: getTheme(state),
        deviceWidth,
        deviceHeight,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            patchChannel,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditChannel);
