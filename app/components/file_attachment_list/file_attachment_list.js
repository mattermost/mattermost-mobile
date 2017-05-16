// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    View,
    TouchableOpacity
} from 'react-native';
import {RequestStatus} from 'mattermost-redux/constants';

import {preventDoubleTap} from 'app/utils/tap';
import FileAttachment from './file_attachment';

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        fetchCache: PropTypes.object.isRequired,
        files: PropTypes.array.isRequired,
        hideOptionsContext: PropTypes.func.isRequired,
        navigator: PropTypes.object,
        onLongPress: PropTypes.func,
        onPress: PropTypes.func,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        toggleSelected: PropTypes.func.isRequired,
        filesForPostRequest: PropTypes.object.isRequired
    };

    componentDidMount() {
        const {post} = this.props;
        this.props.actions.loadFilesForPostIfNecessary(post);
    }

    componentDidUpdate() {
        const {files, filesForPostRequest, post} = this.props;

        // Fixes an issue where files weren't loading with optimistic post
        if (!files.length && post.file_ids.length > 0 && filesForPostRequest.status !== RequestStatus.STARTED) {
            this.props.actions.loadFilesForPostIfNecessary(post);
        }
    }

    goToImagePreview = (post, fileId) => {
        this.props.navigator.showModal({
            screen: 'ImagePreview',
            title: '',
            animationType: 'none',
            passProps: {
                fileId,
                post
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext'
            }
        });
    };

    handleInfoPress = () => {
        this.props.hideOptionsContext();
        this.props.onPress();
    };

    handlePreviewPress = (file) => {
        this.props.hideOptionsContext();
        preventDoubleTap(this.goToImagePreview, this, this.props.post, file.id);
    };

    render() {
        const {files, post} = this.props;

        let fileAttachments;
        if (!files.length && post.file_ids.length > 0) {
            fileAttachments = post.file_ids.map((id) => (
                <FileAttachment
                    key={id}
                    addFileToFetchCache={this.props.actions.addFileToFetchCache}
                    fetchCache={this.props.fetchCache}
                    file={{loading: true}}
                    theme={this.props.theme}
                />
            ));
        } else {
            fileAttachments = files.map((file) => (
                <TouchableOpacity
                    key={file.id}
                    onLongPress={this.props.onLongPress}
                    onPressIn={() => this.props.toggleSelected(true)}
                    onPressOut={() => this.props.toggleSelected(false)}
                >
                    <FileAttachment
                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                        fetchCache={this.props.fetchCache}
                        file={file}
                        onInfoPress={this.handleInfoPress}
                        onPreviewPress={this.handlePreviewPress}
                        theme={this.props.theme}
                    />
                </TouchableOpacity>
            ));
        }

        return (
            <View style={[{flex: 1}, (post.failed && {opacity: 0.5})]}>
                {fileAttachments}
            </View>
        );
    }
}
