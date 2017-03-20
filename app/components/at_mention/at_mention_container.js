// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getUsersByUsername} from 'mattermost-redux/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    return {
        usersByUsername: getUsersByUsername(state),
        ...ownProps
    };
}

export default connect(mapStateToProps)(AtMention);
