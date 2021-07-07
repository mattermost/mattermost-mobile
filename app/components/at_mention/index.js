// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAllGroupsForReferenceByName} from '@mm-redux/selectors/entities/groups';
import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {getAllUserMentionKeys} from '@mm-redux/selectors/entities/search';
import {getUsersByUsername} from '@mm-redux/selectors/entities/users';

import AtMention from './at_mention';

function mapStateToProps(state, ownProps) {
    return {
        theme: getTheme(state),
        usersByUsername: getUsersByUsername(state),
        mentionKeys: ownProps.mentionKeys || getAllUserMentionKeys(state),
        teammateNameDisplay: getTeammateNameDisplaySetting(state),
        groupsByName: getAllGroupsForReferenceByName(state),
    };
}

export default connect(mapStateToProps)(AtMention);
