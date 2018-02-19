// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig, getCurrentUrl} from 'mattermost-redux/selectors/entities/general';

import {loadChannelsByTeamName} from 'app/actions/views/channel';

import MarkdownLink from './markdown_link';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        siteURL: getConfig(state).SiteURL
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadChannelsByTeamName
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MarkdownLink);
