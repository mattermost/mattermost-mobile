// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Font from 'react-native-vector-icons/FontAwesome';
import {RequestStatus} from 'mattermost-redux/constants';

import FileAttachmentPreview from 'app/components/file_attachment_list/file_attachment_preview';

const {height: deviceHeight} = Dimensions.get('window');

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            cancelUploadFileRequest: PropTypes.func.isRequired,
            handleClearFiles: PropTypes.func.isRequired,
            handleRemoveFile: PropTypes.func.isRequired
        }).isRequired,
        channelId: PropTypes.string.isRequired,
        createPostRequestStatus: PropTypes.string.isRequired,
        files: PropTypes.array.isRequired,
        rootId: PropTypes.string,
        uploadFileRequestStatus: PropTypes.string.isRequired,
        uploadFileRequestId: PropTypes.number
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
                    key={file.id}
                    style={style.preview}
                >
                    <FileAttachmentPreview file={file}/>
                    <TouchableOpacity
                        style={style.removeButton}
                        onPress={() => this.props.actions.handleRemoveFile(file.id, this.props.channelId, this.props.rootId)}
                    >
                        <Font
                            name='times'
                            color='#fff'
                            size={15}
                        />
                    </TouchableOpacity>
                </View>
            );
        });
    }

    handleCancelUpload = () => {
        this.props.actions.cancelUploadFileRequest(this.props.uploadFileRequestId);
    }

    render() {
        if (!this.props.files.length && this.props.uploadFileRequestStatus !== RequestStatus.STARTED) {
            return null;
        }

        let component;
        if (this.props.uploadFileRequestStatus === RequestStatus.STARTED) {
            component = (
                <View style={style.loader}>
                    <Text style={style.loaderText}>{'Loading...'}</Text>
                    <TouchableOpacity onPress={this.handleCancelUpload}>
                        <Text style={style.cancelText}>{'Cancel'}</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            component = (
                <ScrollView
                    horizontal={true}
                    style={style.scrollView}
                    contentContainerStyle={style.scrollViewContent}
                >
                    {this.buildFilePreviews()}
                </ScrollView>
            );
        }

        return (
            <KeyboardAvoidingView style={style.container}>
                {component}
            </KeyboardAvoidingView>
        );
    }
}

const style = StyleSheet.create({
    cancelText: {
        padding: 15,
        color: '#fff',
        fontSize: 18
    },
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        bottom: 40,
        height: deviceHeight,
        left: 0,
        position: 'absolute',
        width: '100%'
    },
    loader: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        height: 124,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        bottom: 0,
        position: 'absolute'
    },
    loaderText: {
        fontSize: 24,
        color: '#fff'
    },
    preview: {
        alignItems: 'center',
        height: 115,
        justifyContent: 'center',
        marginLeft: 24,
        width: 115
    },
    removeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        right: 0,
        height: 20,
        width: 20,
        borderRadius: 10,
        backgroundColor: '#000'
    },
    scrollView: {
        flex: 1,
        marginBottom: 24
    },
    scrollViewContent: {
        alignItems: 'flex-end'
    }
});
