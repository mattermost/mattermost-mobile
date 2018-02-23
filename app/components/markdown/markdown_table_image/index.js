// Copyright (c) 2018-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import MarkdownTableImage from './markdown_table_image';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(MarkdownTableImage);
