// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAutolinkedUrlSchemes, getConfig} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserMentionKeys} from 'mattermost-redux/selectors/entities/users';

import Markdown from './markdown';

function mapStateToProps(state) {
    const config = getConfig(state);
    return {
        autolinkedUrlSchemes: getAutolinkedUrlSchemes(state),
        mentionKeys: getCurrentUserMentionKeys(state),
        minimumHashtagLength: parseInt(config.MinimumHashtagLength, 10),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Markdown);
