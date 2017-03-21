// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';
import {loadFilesForPostIfNecessary} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';
import {goToImagePreviewModal} from 'app/actions/navigation';

import FileAttachmentList from './file_attachment_list';

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            ...ownProps,
            files: getFilesForPost(state, ownProps.post),
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToImagePreviewModal,
            loadFilesForPostIfNecessary
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(FileAttachmentList);
