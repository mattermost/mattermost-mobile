// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Font from 'react-native-vector-icons/Ionicons';
import {RequestStatus} from 'mattermost-redux/constants';

import FileAttachmentImage from 'app/components/file_attachment_list/file_attachment_image';
import KeyboardLayout from 'app/components/layout/keyboard_layout';

const {height: deviceHeight} = Dimensions.get('window');

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addFileToFetchCache: PropTypes.func.isRequired,
            handleClearFiles: PropTypes.func.isRequired,
            handleRemoveFile: PropTypes.func.isRequired
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

    componentWillReceiveProps(nextProps) {
        if (this.props.createPostRequestStatus === RequestStatus.STARTED && nextProps.createPostRequestStatus === RequestStatus.SUCCESS) {
            this.props.actions.handleClearFiles(this.props.channelId, this.props.rootId);
        }
    }

    buildFilePreviews = () => {
        return this.props.files.map((file) => {
            return (
                <View
                    key={file.clientId}
                    style={style.preview}
                >
                    <FileAttachmentImage
                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                        fetchCache={this.props.fetchCache}
                        file={file}
                    />
                    <TouchableOpacity
                        style={style.removeButtonWrapper}
                        onPress={() => this.props.actions.handleRemoveFile(file.clientId, this.props.channelId, this.props.rootId)}
                    >
                        <Font
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
            <KeyboardLayout style={style.container}>
                <ScrollView
                    horizontal={true}
                    style={style.scrollView}
                    contentContainerStyle={[style.scrollViewContent, {marginBottom: this.props.inputHeight}]}
                >
                    {this.buildFilePreviews()}
                </ScrollView>
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
    preview: {
        justifyContent: 'flex-end',
        height: 115,
        width: 115,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 4,
        shadowOffset: {
            width: 0,
            height: 0
        }
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
        marginBottom: 24
    },
    scrollViewContent: {
        alignItems: 'flex-end',
        marginLeft: 14
    }
});
