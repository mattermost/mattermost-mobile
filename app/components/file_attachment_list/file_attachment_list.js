// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {StyleSheet, View, DeviceEventEmitter} from 'react-native';

import ImageViewPort from '@components/image_viewport';
import {Client4} from '@mm-redux/client';
import {isDocument, isGif, isImage, isVideo} from '@utils/file';
import {getViewPortWidth, openGalleryAtIndex} from '@utils/images';
import {preventDoubleTap} from '@utils/tap';

import FileAttachment from './file_attachment';

const MAX_VISIBLE_ROW_IMAGES = 4;

export default class FileAttachmentList extends ImageViewPort {
    static propTypes = {
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

        this.filesForGallery = this.getFilesForGallery(props);

        this.buildGalleryFiles().then((results) => {
            this.galleryFiles = results;
        });
    }

    componentDidMount() {
        super.componentDidMount();
        this.onScrollEnd = DeviceEventEmitter.addListener('scrolled', (viewableItems) => {
            if (this.props.postId in viewableItems) {
                this.setState({
                    inViewPort: true,
                });
            }
        });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.files.length !== this.props.files.length) {
            this.filesForGallery = this.getFilesForGallery(this.props);
            this.buildGalleryFiles().then((results) => {
                this.galleryFiles = results;
            });
        }
    }

    componentWillUnmount() {
        super.componentWillUnmount();
        if (this.onScrollEnd && this.onScrollEnd.remove) {
            this.onScrollEnd.remove();
        }
    }

    attachmentIndex = (fileId) => {
        return this.filesForGallery.findIndex((file) => file.id === fileId) || 0;
    };

    attachmentManifest = (attachments) => {
        return attachments.reduce((info, file) => {
            if (isImage(file)) {
                info.imageAttachments.push(file);
            } else {
                info.nonImageAttachments.push(file);
            }
            return info;
        }, {imageAttachments: [], nonImageAttachments: []});
    };

    buildGalleryFiles = async () => {
        const results = [];

        if (this.filesForGallery && this.filesForGallery.length) {
            for (let i = 0; i < this.filesForGallery.length; i++) {
                const file = this.filesForGallery[i];
                if (isDocument(file) || isVideo(file) || (!isImage(file))) {
                    results.push(file);
                    continue;
                }

                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = isGif(file) ? Client4.getFileUrl(file.id) : Client4.getFilePreviewUrl(file.id);
                }

                results.push({
                    ...file,
                    uri,
                });
            }
        }

        return results;
    };

    getFilesForGallery = (props) => {
        const manifest = this.attachmentManifest(props.files);
        const files = manifest.imageAttachments.concat(manifest.nonImageAttachments);
        const results = [];

        if (files && files.length) {
            files.forEach((file) => {
                results.push(file);
            });
        }

        return results;
    };

    handlePreviewPress = preventDoubleTap((idx) => {
        openGalleryAtIndex(idx, this.galleryFiles);
    });

    isSingleImage = (files) => (files.length === 1 && isImage(files[0]));

    renderItems = (items, moreImagesCount, includeGutter = false) => {
        const {canDownloadFiles, isReplyPost, onLongPress, theme} = this.props;
        const isSingleImage = this.isSingleImage(items);
        let nonVisibleImagesCount;
        let container = styles.container;
        const containerWithGutter = [container, styles.gutter];

        return items.map((file, idx) => {
            if (moreImagesCount && idx === MAX_VISIBLE_ROW_IMAGES - 1) {
                nonVisibleImagesCount = moreImagesCount;
            }

            if (idx !== 0 && includeGutter) {
                container = containerWithGutter;
            }

            return (
                <View
                    style={container}
                    key={file.id}
                >
                    <FileAttachment
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        id={file.id}
                        index={this.attachmentIndex(file.id)}
                        onPreviewPress={this.handlePreviewPress}
                        onLongPress={onLongPress}
                        theme={theme}
                        isSingleImage={isSingleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        wrapperWidth={getViewPortWidth(isReplyPost, this.hasPermanentSidebar())}
                        inViewPort={this.state.inViewPort}
                    />
                </View>
            );
        });
    };

    renderImageRow = (images) => {
        if (images.length === 0) {
            return null;
        }

        const {isReplyPost} = this.props;
        const visibleImages = images.slice(0, MAX_VISIBLE_ROW_IMAGES);
        const hasFixedSidebar = this.hasPermanentSidebar();
        const portraitPostWidth = getViewPortWidth(isReplyPost, hasFixedSidebar);

        let nonVisibleImagesCount;
        if (images.length > MAX_VISIBLE_ROW_IMAGES) {
            nonVisibleImagesCount = images.length - MAX_VISIBLE_ROW_IMAGES;
        }

        return (
            <View style={[styles.row, {width: portraitPostWidth}]}>
                { this.renderItems(visibleImages, nonVisibleImagesCount, true) }
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
            <View style={[isFailed && styles.failed]}>
                {this.renderImageRow(manifest.imageAttachments)}
                {this.renderItems(manifest.nonImageAttachments)}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 5,
    },
    container: {
        flex: 1,
    },
    gutter: {
        marginLeft: 8,
    },
    failed: {
        opacity: 0.5,
    },
});
