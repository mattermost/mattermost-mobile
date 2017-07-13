// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Platform} from 'react-native';

import {addFileToFetchCache} from 'app/actions/views/file_preview';
import {getTheme} from 'app/selectors/preferences';
import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';

import ImagePreview from './image_preview';

const STATUSBAR_HEIGHT = 20;

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            ...ownProps,
            fetchCache: state.views.fetchCache,
            files: getFilesForPost(state, ownProps.postId),
            theme: getTheme(state),
            statusBarHeight: Platform.OS === 'ios' ? state.views.root.statusBarHeight : STATUSBAR_HEIGHT
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addFileToFetchCache
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(ImagePreview);
