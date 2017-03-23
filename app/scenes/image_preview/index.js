// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';

import {goBack} from 'app/actions/navigation';
import {addFileToFetchCache} from 'app/actions/views/file_preview';
import {getTheme} from 'app/selectors/preferences';
import {makeGetFilesForPost} from 'mattermost-redux/selectors/entities/files';

import ImagePreview from './image_preview';

import navigationSceneConnect from '../navigationSceneConnect';

function makeMapStateToProps() {
    const getFilesForPost = makeGetFilesForPost();
    return function mapStateToProps(state, ownProps) {
        return {
            ...ownProps,
            fetchCache: state.views.fetchCache,
            files: getFilesForPost(state, ownProps.post),
            theme: getTheme(state)
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addFileToFetchCache,
            goBack
        }, dispatch)
    };
}

export default navigationSceneConnect(makeMapStateToProps, mapDispatchToProps)(ImagePreview);
