// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getUsersTyping} from 'mattermost-redux/selectors/entities/typing';

import {getTheme} from 'app/selectors/preferences';

import Typing from './typing';

function mapStateToProps(state) {
    return {
        theme: getTheme(state),
        typing: getUsersTyping(state)
    };
}

export default connect(mapStateToProps)(Typing);
