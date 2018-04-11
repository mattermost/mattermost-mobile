// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {loadFilesForPostIfNecessary} from 'app/actions/views/channel';
import {getDimensions} from 'app/selectors/device';

import FileAttachmentList from './file_attachment_list';

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            ...getDimensions(state),
            files: getFilesForPost(state, ownProps.postId),
            theme: getTheme(state),
            filesForPostRequest: state.requests.files.getFilesForPost,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadFilesForPostIfNecessary,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(FileAttachmentList);
