// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getConfig, getCurrentUrl} from 'mattermost-redux/selectors/entities/general';

import MarkdownLink from './markdown_link';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        siteURL: getConfig(state).SiteURL,
    };
}

export default connect(mapStateToProps)(MarkdownLink);
