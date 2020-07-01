// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {canDownloadFilesOnMobile} from '@mm-redux/selectors/entities/general';
import {makeGetFilesForPost} from '@mm-redux/selectors/entities/files';
import {getTheme} from '@mm-redux/selectors/entities/preferences';

import FileAttachmentList from './file_attachment_list';

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            canDownloadFiles: canDownloadFilesOnMobile(state),
            files: getFilesForPost(state, ownProps.postId),
            theme: getTheme(state),
        };
    };
}

export default connect(makeMapStateToProps)(FileAttachmentList);
