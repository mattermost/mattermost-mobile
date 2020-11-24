// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {isGuest} from '@utils/users';

import AtMentionItem from './at_mention_item';

function mapStateToProps(state, ownProps) {
    const user = getUser(state, ownProps.userId);
    const config = getConfig(state);
    return {
        firstName: user.first_name,
        lastName: user.last_name,
        nickname: user.nickname,
        username: user.username,
        showFullName: config.ShowFullName,
        isBot: Boolean(user.is_bot),
        isGuest: isGuest(user),
        theme: getTheme(state),
        isCurrentUser: getCurrentUserId(state) === user.id,
    };
}

export default connect(mapStateToProps)(AtMentionItem);
