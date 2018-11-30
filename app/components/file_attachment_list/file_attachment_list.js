// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import {isDocument, isGif, isVideo} from 'app/utils/file';
import {getCacheFile} from 'app/utils/image_cache_manager';
import {previewImageAtIndex} from 'app/utils/images';
import {preventDoubleTap} from 'app/utils/tap';

import FileAttachment from './file_attachment';

const loadingFile = {loading: true};

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        canDownloadFiles: PropTypes.bool.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        fileIds: PropTypes.array.isRequired,
        files: PropTypes.array,
        isFailed: PropTypes.bool,
        navigator: PropTypes.object,
        onLongPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        requestingFiles: PropTypes.bool,
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
        const {files, postId} = this.props;

        if (!files || !files.length) {
            this.props.actions.loadFilesForPostIfNecessary(postId);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.files !== nextProps.files) {
            this.buildGalleryFiles(nextProps).then((results) => {
                this.galleryFiles = results;
            });
        }
    }

    componentDidUpdate() {
        const {fileIds, files, requestingFiles, postId} = this.props;

        // Fixes an issue where files weren't loading with optimistic post
        if (files.length !== fileIds.length && !requestingFiles) {
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

        return fileIds.map((id, idx) => {
            const file = files[idx];
            let fileData = null;

            if (file) {
                fileData = {
                    caption: file.name,
                    data: file,
                    loading: false,
                };
            }

            return (
                <FileAttachment
                    key={id}
                    canDownloadFiles={canDownloadFiles}
                    deviceWidth={deviceWidth}
                    file={fileData || loadingFile}
                    id={id}
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
            <ScrollView
                horizontal={true}
                scrollEnabled={fileIds.length > 1}
                style={[(isFailed && styles.failed)]}
            >
                {this.renderItems()}
            </ScrollView>
        );
    }
}

const styles = StyleSheet.create({
    failed: {
        opacity: 0.5,
    },
});
