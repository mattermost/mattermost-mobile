// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';

import ChannelListRow from './channel_list_row';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();

    return (state, ownProps) => {
        return {
            theme: getTheme(state),
            channel: getChannel(state, ownProps),
        };
    };
}

export default connect(makeMapStateToProps)(ChannelListRow);
