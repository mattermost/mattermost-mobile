// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {getAutolinkedUrlSchemes, getConfig} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getAllUserMentionKeys} from '@mm-redux/selectors/entities/search';

import Markdown from './markdown';

function mapStateToProps(state, ownProps) {
    const {MinimumHashtagLength} = getConfig(state);

    return {
        autolinkedUrlSchemes: getAutolinkedUrlSchemes(state),
        mentionKeys: ownProps.mentionKeys || getAllUserMentionKeys(state),
        minimumHashtagLength: MinimumHashtagLength ? parseInt(MinimumHashtagLength, 10) : 3,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Markdown);
