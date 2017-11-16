// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
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
        fileIds: PropTypes.array.isRequired,
        files: PropTypes.array.isRequired,
        hideOptionsContext: PropTypes.func.isRequired,
        isFailed: PropTypes.bool,
        navigator: PropTypes.object,
        onLongPress: PropTypes.func,
        onPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        toggleSelected: PropTypes.func.isRequired,
        filesForPostRequest: PropTypes.object.isRequired
    };

    componentDidMount() {
        const {postId} = this.props;
        this.props.actions.loadFilesForPostIfNecessary(postId);
    }

    componentDidUpdate() {
        const {fileIds, files, filesForPostRequest, postId} = this.props;

        // Fixes an issue where files weren't loading with optimistic post
        if (!files.length && fileIds.length > 0 && filesForPostRequest.status !== RequestStatus.STARTED) {
            this.props.actions.loadFilesForPostIfNecessary(postId);
        }
    }

    goToImagePreview = (postId, fileId) => {
        this.props.navigator.showModal({
            screen: 'ImagePreview',
            title: '',
            animationType: 'none',
            passProps: {
                fileId,
                postId
            },
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'black',
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
        Keyboard.dismiss();
        preventDoubleTap(this.goToImagePreview, this, this.props.postId, file.id);
    };

    handlePressIn = () => {
        this.props.toggleSelected(true);
    };

    handlePressOut = () => {
        this.props.toggleSelected(false);
    };

    render() {
        const {fileIds, files, isFailed} = this.props;

        let fileAttachments;
        if (!files.length && fileIds.length > 0) {
            fileAttachments = fileIds.map((id) => (
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
                    onPressIn={this.handlePressIn}
                    onPressOut={this.handlePressOut}
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
            <View style={[{flex: 1}, (isFailed && {opacity: 0.5})]}>
                {fileAttachments}
            </View>
        );
    }
}
