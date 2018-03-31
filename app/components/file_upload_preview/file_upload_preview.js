// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';

import FileUploadItem from './file_upload_item';

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        createPostRequestStatus: PropTypes.string.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        files: PropTypes.array.isRequired,
        filesUploadingForCurrentChannel: PropTypes.bool.isRequired,
        inputHeight: PropTypes.number.isRequired,
        rootId: PropTypes.string,
        showFileMaxWarning: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    buildFilePreviews = () => {
        return this.props.files.map((file) => {
            return (
                <FileUploadItem
                    key={file.clientId}
                    channelId={this.props.channelId}
                    file={file}
                    rootId={this.props.rootId}
                    theme={this.props.theme}
                />
            );
        });
    };

    render() {
        const {
            showFileMaxWarning,
            channelIsLoading,
            filesUploadingForCurrentChannel,
            deviceHeight,
            files,
        } = this.props;
        if (channelIsLoading || (!files.length && !filesUploadingForCurrentChannel)) {
            return null;
        }

        return (
            <View>
                <View style={[style.container, {height: deviceHeight}]}>
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                    >
                        {this.buildFilePreviews()}
                    </ScrollView>
                    {showFileMaxWarning && (
                        <FormattedText
                            style={style.warning}
                            id='mobile.file_upload.max_warning'
                            defaultMessage='Uploads limited to 5 files maximum.'
                        />
                    )}

                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        left: 0,
        bottom: 0,
        position: 'absolute',
        width: '100%',
    },
    scrollView: {
        flex: 1,
        marginBottom: 10,
    },
    scrollViewContent: {
        alignItems: 'flex-end',
        marginLeft: 14,
    },
    warning: {
        color: 'white',
        marginLeft: 14,
        marginBottom: 10,
    },
});
