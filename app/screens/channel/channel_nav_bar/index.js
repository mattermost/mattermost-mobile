// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {isLandscape} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import ChannelNavBar from './channel_nav_bar';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelNavBar);
