// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getDimensions} from 'app/selectors/device';
import ReactionPicker from './reaction_picker';

function mapStateToProps(state) {
    const {deviceWidth} = getDimensions(state);
    return {
        theme: getTheme(state),
        recentEmojis: state.views.recentEmojis,
        deviceWidth,
    };
}

export default connect(mapStateToProps)(ReactionPicker);
