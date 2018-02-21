// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getUser} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import AtMentionItem from './at_mention_item';

function mapStateToProps(state, ownProps) {
    const user = getUser(state, ownProps.userId);

    return {
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(AtMentionItem);
