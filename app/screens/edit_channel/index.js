// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamUrl} from 'mattermost-redux/selectors/entities/teams';
import {patchChannel} from 'mattermost-redux/actions/channels';
import {General} from 'mattermost-redux/constants';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import EditChannel from './edit_channel';

function mapStateToProps(state) {
    const {updateChannel: updateChannelRequest} = state.requests.channels;
    const channel = getCurrentChannel(state);

    return {
        channel,
        currentTeamUrl: getCurrentTeamUrl(state),
        updateChannelRequest,
        isDMorGM: channel.type === General.DM_CHANNEL ||
            channel.type === General.GM_CHANNEL,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            patchChannel
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditChannel);
