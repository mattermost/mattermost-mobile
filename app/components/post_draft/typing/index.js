// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getUsersTyping} from '@mm-redux/selectors/entities/typing';

import Typing from './typing';

function mapStateToProps(state) {
    return {
        typing: getUsersTyping(state),
    };
}

export default connect(mapStateToProps)(Typing);
