// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {showModalOverCurrentContext} from 'app/actions/navigation';

import AttachmentImage from './attachment_image';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            showModalOverCurrentContext,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps)(AttachmentImage);
