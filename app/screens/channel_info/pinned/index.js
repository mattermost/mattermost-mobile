// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getCurrentChannelStats} from '@mm-redux/selectors/entities/channels';

import Pinned from './pinned';

function mapStateToProps(state) {
    const currentChannelStats = getCurrentChannelStats(state);
    const pinnedCount = currentChannelStats?.pinnedpost_count || 0;

    return {
        pinnedCount,
    };
}

export default connect(mapStateToProps)(Pinned);
