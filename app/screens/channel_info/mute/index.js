// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {updateChannelNotifyProps} from '@mm-redux/actions/channels';
import {getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {isChannelMuted} from '@mm-redux/utils/channel_utils';

import Mute from './mute';

function mapStateToProps(state) {
    const currentChannelMember = getMyCurrentChannelMembership(state);

    return {
        isChannelMuted: isChannelMuted(currentChannelMember),
    };
}

const mapDispatchToProps = {
    updateChannelNotifyProps,
};

export default connect(mapStateToProps, mapDispatchToProps)(Mute);
