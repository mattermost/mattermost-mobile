// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, StyleSheet, View} from 'react-native';

import {Client4} from 'mattermost-redux/client';

import {isDocument, isGif, isVideo} from 'app/utils/file';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex} from 'app/utils/images';
import {preventDoubleTap} from 'app/utils/tap';
import {emptyFunction} from 'app/utils/general';

import FileAttachment from './file_attachment';

const MAX_VISIBLE_ROW_IMAGES = 4;
const VIEWPORT_IMAGE_OFFSET = 93;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            loadFilesForPostIfNecessary: PropTypes.func.isRequired,
        }).isRequired,
        canDownloadFiles: PropTypes.bool.isRequired,
        fileIds: PropTypes.array.isRequired,
        files: PropTypes.array,
        isFailed: PropTypes.bool,
        onLongPress: PropTypes.func,
        postId: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        isReplyPost: PropTypes.bool,
    };

    static defaultProps = {
        files: [],
    };

    constructor(props) {
        super(props);

        this.items = [];
        this.state = {
            loadingFiles: props.files.length === 0,
            portraitPostWidth: this.getPortraitPostWidth(),
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
        previewImageAtIndex(this.items, idx, this.galleryFiles);
    });

    attachmentManifest = (attachments) => {
        return attachments.reduce((info, file) => {
            if (file.has_preview_image) {
                info.imageAttachments.push(file);
            } else {
                info.nonImageAttachments.push(file);
            }
            return info;
        }, {imageAttachments: [], nonImageAttachments: []});
    }

    isImage = (file) => (file.has_preview_image);

    isSingleImage = (files) => (files.length === 1 && this.isImage(files[0]));

    attachmentIndex = (fileId) => {
        const {files} = this.props;
        return files.findIndex((file) => file.id === fileId);
    }

    getPortraitPostWidth = () => {
        const {isReplyPost} = this.props;
        const {width, height} = Dimensions.get('window');

        let portraitPostWidth = Math.min(width, height) - VIEWPORT_IMAGE_OFFSET;

        if (isReplyPost) {
            portraitPostWidth -= VIEWPORT_IMAGE_REPLY_OFFSET;
        }

        return portraitPostWidth;
    };

    renderItems = (items, moreImagesCount) => {
        const {canDownloadFiles, onLongPress, theme} = this.props;
        const {portraitPostWidth} = this.state;
        const isSingleImage = this.isSingleImage(items);
        let nonVisibleImagesCount;
        let container = styles.container;
        const containerWithGutter = [container, styles.gutter];
        const gifContainer = [container, {width: portraitPostWidth, marginTop: 10}];

        return items.map((file, idx) => {
            const f = {
                caption: file.name,
                data: file,
            };

            if (moreImagesCount && idx === MAX_VISIBLE_ROW_IMAGES - 1) {
                nonVisibleImagesCount = moreImagesCount;
            }

            if (idx !== 0) {
                container = containerWithGutter;
            }

            if (isGif(file)) {
                container = gifContainer;
            }

            return (
                <View
                    style={container}
                    key={file.id}
                >
                    <FileAttachment
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={f}
                        id={file.id}
                        index={this.attachmentIndex(file.id)}
                        onCaptureRef={this.handleCaptureRef}
                        onPreviewPress={this.handlePreviewPress}
                        onLongPress={onLongPress}
                        theme={theme}
                        isSingleImage={isSingleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        wrapperWidth={portraitPostWidth}
                    />
                </View>
            );
        });
    };

    renderImageRow = (images) => {
        if (images.length === 0) {
            return null;
        }

        const visibleImages = images.slice(0, MAX_VISIBLE_ROW_IMAGES);
        const {portraitPostWidth} = this.state;

        let nonVisibleImagesCount;
        if (images.length > MAX_VISIBLE_ROW_IMAGES) {
            nonVisibleImagesCount = images.length - MAX_VISIBLE_ROW_IMAGES;
        }

        return (
            <View style={[styles.row, {width: portraitPostWidth}]}>
                { this.renderItems(visibleImages, nonVisibleImagesCount) }
            </View>
        );
    };

    render() {
        const {canDownloadFiles, fileIds, files, isFailed} = this.props;

        if (!files.length && fileIds.length > 0) {
            return fileIds.map((id, idx) => (
                <FileAttachment
                    key={id}
                    canDownloadFiles={canDownloadFiles}
                    file={{loading: true}}
                    id={id}
                    index={idx}
                    theme={this.props.theme}
                />
            ));
        }

        const manifest = this.attachmentManifest(files);

        return (
            <View style={isFailed && styles.failed}>
                { this.renderImageRow(manifest.imageAttachments) }
                { this.renderItems(manifest.nonImageAttachments) }
            </View>
        );
    }
}

const styles = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
    },
    container: {
        flex: 1,
    },
    gutter: {
        marginLeft: 3,
    },
    failed: {
        opacity: 0.5,
    },
});
