// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getTheme} from '@mm-redux/selectors/entities/preferences';

import GroupMentionItem from './at_mention_group';

function mapStateToProps(state, ownProps) {
    return {
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(GroupMentionItem);
