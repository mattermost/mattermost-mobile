// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Platform} from 'react-native';

import {addFileToFetchCache} from 'app/actions/views/file_preview';
import {getDimensions, getStatusBarHeight} from 'app/selectors/device';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {canDownloadFilesOnMobile} from 'mattermost-redux/selectors/entities/general';
import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';

import ImagePreview from './image_preview';

const STATUSBAR_HEIGHT = 20;

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            ...getDimensions(state),
            canDownloadFiles: canDownloadFilesOnMobile(state),
            fetchCache: state.views.fetchCache,
            files: getFilesForPost(state, ownProps.postId),
            theme: getTheme(state),
            statusBarHeight: Platform.OS === 'ios' ? getStatusBarHeight(state) : STATUSBAR_HEIGHT,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addFileToFetchCache,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ImagePreview);
