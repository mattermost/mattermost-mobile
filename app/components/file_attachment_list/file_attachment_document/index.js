// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {goToScreen} from 'app/actions/navigation';

import FileAttachmentDocument from './file_attachment_document';

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToScreen,
        }, dispatch),
    };
}

export default connect(null, mapDispatchToProps, null, {forwardRef: true})(FileAttachmentDocument);
