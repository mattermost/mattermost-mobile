// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import Font from 'react-native-vector-icons/FontAwesome';
import {RequestStatus} from 'mattermost-redux/constants';

import FileAttachmentPreview from 'app/components/file_attachment_list/file_attachment_preview';
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
                    <FileAttachmentPreview
                        addFileToFetchCache={this.props.actions.addFileToFetchCache}
                        fetchCache={this.props.fetchCache}
                        file={file}
                    />
                    <TouchableOpacity
                        style={style.removeButton}
                        onPress={() => this.props.actions.handleRemoveFile(file.clientId, this.props.channelId, this.props.rootId)}
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

    render() {
        if (!this.props.files.length && this.props.uploadFileRequestStatus !== RequestStatus.STARTED) {
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
    cancelText: {
        padding: 15,
        color: '#fff',
        fontSize: 18
    },
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        height: deviceHeight,
        left: 0,
        bottom: 0,
        position: 'absolute',
        width: '100%'
    },
    preview: {
        alignItems: 'center',
        height: 115,
        justifyContent: 'center',
        marginRight: 5,
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
        alignItems: 'flex-end',
        marginLeft: 10
    }
});
