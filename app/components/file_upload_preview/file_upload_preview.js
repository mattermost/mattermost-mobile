// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {RequestStatus} from 'mattermost-redux/constants';

import FileAttachmentImage from 'app/components/file_attachment_list/file_attachment_image';
import KeyboardLayout from 'app/components/layout/keyboard_layout';

const {height: deviceHeight} = Dimensions.get('window');

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired,
            handleRemoveFile: PropTypes.func.isRequired,
            retryFileUpload: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        createPostRequestStatus: PropTypes.string.isRequired,
        fetchCache: PropTypes.object.isRequired,
        files: PropTypes.array.isRequired,
        inputHeight: PropTypes.number.isRequired,
        rootId: PropTypes.string,
        uploadFileRequestStatus: PropTypes.string.isRequired
    };

    handleRetryFileUpload = (file) => {
        if (!file.failed) {
            return;
        }

        this.props.actions.retryFileUpload(file, this.props.rootId);
    };

    buildFilePreviews = () => {
        return this.props.files.map((file) => {
            return (
                <View
                    key={file.clientId}
                    style={style.preview}
                >
                    <View style={style.previewShadow}>
                        <FileAttachmentImage
                            addFileToFetchCache={this.props.actions.addFileToFetchCache}
                            fetchCache={this.props.fetchCache}
                            file={file}
                        />
                        {file.failed &&
                        <TouchableOpacity
                            style={style.failed}
                            onPress={() => this.handleRetryFileUpload(file)}
                        >
                            <Icon
                                name='md-refresh'
                                size={50}
                                color='#fff'
                            />
                        </TouchableOpacity>
                        }
                    </View>
                    <TouchableOpacity
                        style={style.removeButtonWrapper}
                        onPress={() => this.props.actions.handleRemoveFile(file.clientId, this.props.channelId, this.props.rootId)}
                    >
                        <Icon
                            name='md-close'
                            color='#fff'
                            size={18}
                            style={style.removeButtonIcon}
                        />
                    </TouchableOpacity>
                </View>
            );
        });
    }

    render() {
        if (this.props.channelIsLoading || (!this.props.files.length && this.props.uploadFileRequestStatus !== RequestStatus.STARTED)) {
            return null;
        }

        return (
            <KeyboardLayout>
                <View style={[style.container]}>
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                    >
                        {this.buildFilePreviews()}
                    </ScrollView>
                </View>
            </KeyboardLayout>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        height: deviceHeight,
        left: 0,
        bottom: 0,
        position: 'absolute',
        width: '100%'
    },
    failed: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        position: 'absolute',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    preview: {
        justifyContent: 'flex-end',
        height: 115,
        width: 115
    },
    previewShadow: {
        height: 100,
        width: 100,
        elevation: 10,
        ...Platform.select({
            ios: {
                backgroundColor: '#fff',
                shadowColor: '#000',
                shadowOpacity: 0.5,
                shadowRadius: 4,
                shadowOffset: {
                    width: 0,
                    height: 0
                }
            }
        })
    },
    removeButtonIcon: Platform.select({
        ios: {
            marginTop: 2
        },
        android: {
            marginLeft: 1
        }
    }),
    removeButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        overflow: 'hidden',
        elevation: 11,
        top: 7,
        right: 7,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#fff'
    },
    scrollView: {
        flex: 1,
        marginBottom: 12
    },
    scrollViewContent: {
        alignItems: 'flex-end',
        marginLeft: 14
    }
});
