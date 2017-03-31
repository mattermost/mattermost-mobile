// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
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
                        <View style={{width: 14, height: 14, borderRadius: 7, backgroundColor: '#fff', position: 'absolute'}}/>
                        <Font
                            name='ios-close-circle'
                            color='#000'
                            size={20}
                            style={{position: 'absolute'}}
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
        shadowOpacity: 1,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 0
        }
    },
    removeButtonWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 7,
        right: 7,
        width: 20,
        height: 20,
        borderRadius: 10,
        ...Platform.select({
            android: {
                backgroundColor: '#000'
            }
        })
    },
    scrollView: {
        flex: 1,
        marginBottom: 24
    },
    scrollViewContent: {
        alignItems: 'flex-end',
        marginLeft: 16
    }
});
