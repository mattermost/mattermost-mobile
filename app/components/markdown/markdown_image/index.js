// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getCurrentUrl} from 'mattermost-redux/selectors/entities/general';

import MarkdownImage from './markdown_image';

function mapStateToProps(state) {
    return {
        serverURL: getCurrentUrl(state),
    };
}

export default connect(mapStateToProps)(MarkdownImage);
