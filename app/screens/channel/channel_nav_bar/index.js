// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import ChannelNavBar from './channel_nav_bar';

import {isLandscape} from 'app/selectors/device';

function mapStateToProps(state) {
    return {
        isLandscape: isLandscape(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(ChannelNavBar);
