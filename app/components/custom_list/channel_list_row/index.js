// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from 'app/selectors/preferences';

import {makeGetChannel} from 'mattermost-redux/selectors/entities/channels';

import ChannelListRow from './channel_list_row';

function makeMapStateToProps() {
    const getChannel = makeGetChannel();

    return (state, ownProps) => {
        return {
            theme: getTheme(state),
            channel: getChannel(state, ownProps),
            ...ownProps
        };
    };
}

export default connect(makeMapStateToProps)(ChannelListRow);
