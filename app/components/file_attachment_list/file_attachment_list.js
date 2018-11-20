// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';
import {RequestStatus} from 'mattermost-redux/constants';

import {isDocument, isGif, isVideo} from 'app/utils/file';
import {getCacheFile} from 'app/utils/image_cache_manager';
import {previewImageAtIndex} from 'app/utils/images';
import {preventDoubleTap} from 'app/utils/tap';

import FileAttachment from './file_attachment';

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        fileIds: PropTypes.array.isRequired,
        files: PropTypes.array.isRequired,
        isFailed: PropTypes.bool,
        navigator: PropTypes.object,
        onLongPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        filesForPostRequest: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);

        this.items = [];
        this.previewItems = [];

        this.buildGalleryFiles(props).then((results) => {
            this.galleryFiles = results;
        });
    }

    componentDidMount() {
        const {postId} = this.props;
        this.props.actions.loadFilesForPostIfNecessary(postId);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.files !== nextProps.files) {
            this.buildGalleryFiles(nextProps).then((results) => {
                this.galleryFiles = results;
            });
        }
    }

    componentDidUpdate() {
        const {fileIds, files, filesForPostRequest, postId} = this.props;

        // Fixes an issue where files weren't loading with optimistic post
        if (!files.length && fileIds.length > 0 && filesForPostRequest.status !== RequestStatus.STARTED) {
            this.props.actions.loadFilesForPostIfNecessary(postId);
        }
    }

    buildGalleryFiles = async (props) => {
        const {files} = props;
        const results = [];

        if (files && files.length) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const caption = file.name;

                if (isDocument(file) || isVideo(file) || (!file.has_preview_image && !isGif(file))) {
                    results.push({
                        caption,
                        data: file,
                    });
                    continue;
                }

                let uri;
                let cache;
                if (file.localPath) {
                    uri = file.localPath;
                } else if (isGif(file)) {
                    cache = await getCacheFile(file.name, Client4.getFileUrl(file.id)); // eslint-disable-line no-await-in-loop
                } else {
                    cache = await getCacheFile(file.name, Client4.getFilePreviewUrl(file.id)); // eslint-disable-line no-await-in-loop
                }

                if (cache) {
                    const prefix = Platform.OS === 'android' ? 'file://' : '';
                    uri = `${prefix}${cache.path}`;
                }

                results.push({
                    caption,
                    source: {uri},
                    data: file,
                });
            }
        }

        return results;
    };

    handleCaptureRef = (ref, idx) => {
        this.items[idx] = ref;
    };

    handlePreviewPress = preventDoubleTap((idx) => {
        Keyboard.dismiss();
        previewImageAtIndex(this.props.navigator, this.items, idx, this.galleryFiles);
    });

    renderItems = () => {
        const {canDownloadFiles, deviceWidth, fileIds, files, navigator} = this.props;

        if (!files.length && fileIds.length > 0) {
            return fileIds.map((id, idx) => (
                <FileAttachment
                    key={id}
                    canDownloadFiles={canDownloadFiles}
                    deviceWidth={deviceWidth}
                    file={{loading: true}}
                    index={idx}
                    theme={this.props.theme}
                />
            ));
        }

        return files.map((file, idx) => {
            const f = {
                caption: file.name,
                data: file,
            };

            return (
                <FileAttachment
                    key={file.id}
                    canDownloadFiles={canDownloadFiles}
                    deviceWidth={deviceWidth}
                    file={f}
                    index={idx}
                    navigator={navigator}
                    onCaptureRef={this.handleCaptureRef}
                    onPreviewPress={this.handlePreviewPress}
                    onLongPress={this.props.onLongPress}
                    theme={this.props.theme}
                />
            );
        });
    };

    render() {
        const {fileIds, isFailed} = this.props;

        return (
            <View style={styles.flex}>
                <ScrollView
                    horizontal={true}
                    scrollEnabled={fileIds.length > 1}
                    style={[styles.flex, (isFailed && styles.failed)]}
                >
                    {this.renderItems()}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    failed: {
        opacity: 0.5,
    },
});
