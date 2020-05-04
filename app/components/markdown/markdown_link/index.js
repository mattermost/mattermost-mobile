// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig, getCurrentUrl} from '@mm-redux/selectors/entities/general';
import {selectChannelFromDeepLinkMatch} from '@actions/channels';

import MarkdownLink from './markdown_link';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        siteURL: getConfig(state).SiteURL,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            selectChannelFromDeepLinkMatch,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MarkdownLink);
