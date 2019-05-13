// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    ScrollView,
    StyleSheet,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import {isDocument, isGif, isVideo} from 'app/utils/file';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex} from 'app/utils/images';
import {preventDoubleTap} from 'app/utils/tap';
import {emptyFunction} from 'app/utils/general';

import FileAttachment from './file_attachment';

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
    };

    static defaultProps = {
        files: [],
    };

    constructor(props) {
        super(props);

        this.items = [];
        this.previewItems = [];

        this.state = {
            loadingFiles: props.files.length === 0,
        };

        this.buildGalleryFiles(props).then((results) => {
            this.galleryFiles = results;
        });
    }

    componentDidMount() {
        const {files} = this.props;
        if (files.length === 0) {
            this.loadFilesForPost();
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.files !== nextProps.files) {
            this.buildGalleryFiles(nextProps).then((results) => {
                this.galleryFiles = results;
            });
        }
        if (!this.state.loadingFiles && nextProps.files.length === 0) {
            this.setState({
                loadingFiles: true,
            });
            this.loadFilesForPost();
        }
    }

    loadFilesForPost = async () => {
        await this.props.actions.loadFilesForPostIfNecessary(this.props.postId);
        this.setState({
            loadingFiles: false,
        });
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
                if (file.localPath) {
                    uri = file.localPath;
                } else if (isGif(file)) {
                    uri = await ImageCacheManager.cache(file.name, Client4.getFileUrl(file.id), emptyFunction); // eslint-disable-line no-await-in-loop
                } else {
                    uri = await ImageCacheManager.cache(file.name, Client4.getFilePreviewUrl(file.id), emptyFunction); // eslint-disable-line no-await-in-loop
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
                    id={id}
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
                    id={file.id}
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
