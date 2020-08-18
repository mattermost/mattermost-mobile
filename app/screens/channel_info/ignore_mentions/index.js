// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {updateChannelNotifyProps} from '@mm-redux/actions/channels';
import {getMyCurrentChannelMembership} from '@mm-redux/selectors/entities/channels';
import {getCurrentUser} from '@mm-redux/selectors/entities/users';
import {areChannelMentionsIgnored} from '@mm-redux/utils/channel_utils';

import IgnoreMentions from './ignore_mentions';

function mapStateToProps(state) {
    const currentUser = getCurrentUser(state);
    const currentChannelMember = getMyCurrentChannelMembership(state);

    return {
        ignore: areChannelMentionsIgnored(currentChannelMember && currentChannelMember.notify_props, currentUser.notify_props),
        userId: currentUser?.id || '',
    };
}

const mapDispatchToProps = {
    updateChannelNotifyProps,
};

export default connect(mapStateToProps, mapDispatchToProps)(IgnoreMentions);
