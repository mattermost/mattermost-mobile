// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamUrl} from '@mm-redux/selectors/entities/teams';
import {patchChannel, getChannel} from '@mm-redux/actions/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import {setChannelDisplayName} from 'app/actions/views/channel';

import EditChannel from './edit_channel';

function mapStateToProps(state) {
    const {updateChannel: updateChannelRequest} = state.requests.channels;
    const channel = getCurrentChannel(state);

    return {
        channel,
        currentTeamUrl: getCurrentTeamUrl(state),
        updateChannelRequest,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            patchChannel,
            getChannel,
            setChannelDisplayName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(EditChannel);
