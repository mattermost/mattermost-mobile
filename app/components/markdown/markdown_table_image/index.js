// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {goToScreen} from 'app/actions/navigation';

import MarkdownTableImage from './markdown_table_image';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToScreen,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(MarkdownTableImage);
