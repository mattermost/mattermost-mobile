// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import {Client4} from 'mattermost-redux/client';
import {RequestStatus} from 'mattermost-redux/constants';

import {isDocument, isGif, isVideo} from 'app/utils/file';
import {getCacheFile} from 'app/utils/image_cache_manager';
import {preventDoubleTap} from 'app/utils/tap';

import FileAttachment from './file_attachment';

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
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
                    cache = await getCacheFile(file.name, Client4.getFileUrl(file.id));
                } else {
                    cache = await getCacheFile(file.name, Client4.getFilePreviewUrl(file.id));
                }

                if (cache) {
                    let path = cache.path;
                    if (Platform.OS === 'android') {
                        path = `file://${path}`;
                    }

                    uri = path;
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

    getItemMeasures = (index, cb) => {
        const activeComponent = this.items[index];

        if (!activeComponent) {
            cb(null);
            return;
        }

        activeComponent.measure((rx, ry, width, height, x, y) => {
            cb({
                origin: {x, y, width, height},
            });
        });
    };

    getPreviewProps = (index) => {
        const previewComponent = this.previewItems[index];
        return previewComponent ? {...previewComponent.props} : {};
    };

    goToImagePreview = (passProps) => {
        this.props.navigator.showModal({
            screen: 'ImagePreview',
            title: '',
            animationType: 'none',
            passProps,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
                modalPresentationStyle: 'overCurrentContext',
            },
        });
    };

    handleCaptureRef = (ref, idx) => {
        this.items[idx] = ref;
    };

    handleCapturePreviewRef = (ref, idx) => {
        this.previewItems[idx] = ref;
    };

    handleInfoPress = () => {
        this.props.hideOptionsContext();
        this.props.onPress();
    };

    handlePreviewPress = preventDoubleTap((idx) => {
        this.props.hideOptionsContext();
        Keyboard.dismiss();
        const component = this.items[idx];

        if (!component) {
            return;
        }

        component.measure((rx, ry, width, height, x, y) => {
            this.goToImagePreview({
                index: idx,
                origin: {x, y, width, height},
                target: {x: 0, y: 0, opacity: 1},
                files: this.galleryFiles,
                getItemMeasures: this.getItemMeasures,
                getPreviewProps: this.getPreviewProps,
            });
        });
    });

    handlePressIn = () => {
        this.props.toggleSelected(true);
    };

    handlePressOut = () => {
        this.props.toggleSelected(false);
    };

    renderItems = () => {
        const {deviceWidth, fileIds, files, navigator} = this.props;

        if (!files.length && fileIds.length > 0) {
            return fileIds.map((id, idx) => (
                <FileAttachment
                    key={id}
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
                <TouchableOpacity
                    key={file.id}
                    onLongPress={this.props.onLongPress}
                    onPressIn={this.handlePressIn}
                    onPressOut={this.handlePressOut}
                >
                    <FileAttachment
                        deviceWidth={deviceWidth}
                        file={f}
                        index={idx}
                        navigator={navigator}
                        onCaptureRef={this.handleCaptureRef}
                        onCapturePreviewRef={this.handleCapturePreviewRef}
                        onInfoPress={this.handleInfoPress}
                        onPreviewPress={this.handlePreviewPress}
                        theme={this.props.theme}
                    />
                </TouchableOpacity>
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
