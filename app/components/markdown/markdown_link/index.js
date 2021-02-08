// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getConfig, getCurrentUrl} from '@mm-redux/selectors/entities/general';
import {getCurrentTeam} from '@mm-redux/selectors/entities/teams';
import {handleSelectChannelByName} from 'app/actions/views/channel';

import MarkdownLink from './markdown_link';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        siteURL: getConfig(state).SiteURL,
        currentTeamName: getCurrentTeam(state)?.name,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            handleSelectChannelByName,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MarkdownLink);
