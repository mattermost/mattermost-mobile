// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAutolinkedUrlSchemes} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserMentionKeys} from 'mattermost-redux/selectors/entities/users';

import Markdown from './markdown';

function mapStateToProps(state) {
    return {
        autolinkedUrlSchemes: getAutolinkedUrlSchemes(state),
        mentionKeys: getCurrentUserMentionKeys(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Markdown);
