// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {makeGetFilesForPost} from 'service/selectors/entities/files';
import {loadFilesForPostsIfNecessary} from 'app/actions/views/channel';

import FileAttachmentList from './file_attachment_list';

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {...ownProps,
            files: getFilesForPost(state, ownProps)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadFilesForPostsIfNecessary
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(FileAttachmentList);
