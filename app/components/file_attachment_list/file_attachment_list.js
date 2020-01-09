// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {TABLET_WIDTH} from 'app/components/sidebars/drawer_layout';
import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {isDocument, isGif, isVideo} from 'app/utils/file';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {previewImageAtIndex} from 'app/utils/images';
import {preventDoubleTap} from 'app/utils/tap';
import {emptyFunction} from 'app/utils/general';

import FileAttachment from './file_attachment';

const MAX_VISIBLE_ROW_IMAGES = 4;
const VIEWPORT_IMAGE_OFFSET = 70;
const VIEWPORT_IMAGE_REPLY_OFFSET = 11;

export default class FileAttachmentList extends PureComponent {
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
        this.filesForGallery = this.getFilesForGallery(props);

        this.buildGalleryFiles().then((results) => {
            this.galleryFiles = results;
        });
    }

    componentDidMount() {
        const {files} = this.props;

        this.mounted = true;
        this.handlePermanentSidebar();
        this.handleDimensions();
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        Dimensions.addEventListener('change', this.handleDimensions);

        if (files.length === 0) {
            this.loadFilesForPost();
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.files !== this.props.files) {
            this.filesForGallery = this.getFilesForGallery(this.props);
            this.buildGalleryFiles().then((results) => {
                this.galleryFiles = results;
            });
        }
        if (this.props.files !== prevProps.files && this.props.files.length === 0) {
            this.loadFilesForPost();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        Dimensions.removeEventListener('change', this.handleDimensions);
    }

    attachmentIndex = (fileId) => {
        return this.filesForGallery.findIndex((file) => file.id === fileId) || 0;
    };

    attachmentManifest = (attachments) => {
        return attachments.reduce((info, file) => {
            if (this.isImage(file)) {
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

    getPortraitPostWidth = () => {
        const {isReplyPost} = this.props;
        const {width, height} = Dimensions.get('window');
        const permanentSidebar = DeviceTypes.IS_TABLET && !this.state?.isSplitView && this.state?.permanentSidebar;
        let portraitPostWidth = Math.min(width, height) - VIEWPORT_IMAGE_OFFSET;

        if (permanentSidebar) {
            portraitPostWidth -= TABLET_WIDTH;
        }

        if (isReplyPost) {
            portraitPostWidth -= VIEWPORT_IMAGE_REPLY_OFFSET;
        }

        return portraitPostWidth;
    };

    handleCaptureRef = (ref, idx) => {
        this.items[idx] = ref;
    };

    handleDimensions = () => {
        if (this.mounted) {
            if (DeviceTypes.IS_TABLET) {
                mattermostManaged.isRunningInSplitView().then((result) => {
                    const isSplitView = Boolean(result.isSplitView);
                    this.setState({isSplitView});
                });
            }
        }
    };

    handlePermanentSidebar = async () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            const enabled = await AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS);
            this.setState({permanentSidebar: enabled === 'true'});
        }
    };

    handlePreviewPress = preventDoubleTap((idx) => {
        previewImageAtIndex(this.items, idx, this.galleryFiles);
    });

    isImage = (file) => (file.has_preview_image || isGif(file));

    isSingleImage = (files) => (files.length === 1 && this.isImage(files[0]));

    loadFilesForPost = async () => {
        await this.props.actions.loadFilesForPostIfNecessary(this.props.postId);
    }

    renderItems = (items, moreImagesCount, includeGutter = false) => {
        const {canDownloadFiles, onLongPress, theme} = this.props;
        const isSingleImage = this.isSingleImage(items);
        let nonVisibleImagesCount;
        let container = styles.container;
        const containerWithGutter = [container, styles.gutter];

        return items.map((file, idx) => {
            const f = {
                caption: file.name,
                data: file,
            };

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
                        file={f}
                        id={file.id}
                        index={this.attachmentIndex(file.id)}
                        onCaptureRef={this.handleCaptureRef}
                        onPreviewPress={this.handlePreviewPress}
                        onLongPress={onLongPress}
                        theme={theme}
                        isSingleImage={isSingleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        wrapperWidth={this.getPortraitPostWidth()}
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
