// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import FormattedText from 'app/components/formatted_text';

import FileUploadItem from './file_upload_item';

export default class FileUploadPreview extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        channelIsLoading: PropTypes.bool,
        deviceHeight: PropTypes.number.isRequired,
        files: PropTypes.array.isRequired,
        filesUploadingForCurrentChannel: PropTypes.bool.isRequired,
        rootId: PropTypes.string,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        files: [],
    };

    state = {
        fileSizeWarning: null,
        showFileMaxWarning: false,
    };

    componentDidMount() {
        EventEmitter.on('fileMaxWarning', this.handleFileMaxWarning);
        EventEmitter.on('fileSizeWarning', this.handleFileSizeWarning);
    }

    componentWillUnmount() {
        EventEmitter.off('fileMaxWarning', this.handleFileMaxWarning);
        EventEmitter.off('fileSizeWarning', this.handleFileSizeWarning);
    }

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

    handleFileMaxWarning = () => {
        this.setState({showFileMaxWarning: true});
        setTimeout(() => {
            this.setState({showFileMaxWarning: false});
        }, 3000);
    };

    handleFileSizeWarning = (message) => {
        this.setState({fileSizeWarning: message});
    };

    render() {
        const {
            channelIsLoading,
            filesUploadingForCurrentChannel,
            deviceHeight,
            files,
        } = this.props;
        const {fileSizeWarning, showFileMaxWarning} = this.state;
        if (
            !fileSizeWarning && !showFileMaxWarning &&
            (channelIsLoading || (!files.length && !filesUploadingForCurrentChannel))
        ) {
            return null;
        }

        return (
            <View>
                <View style={[style.container, {height: deviceHeight}]}>
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                        keyboardShouldPersistTaps={'handled'}
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
                    {Boolean(fileSizeWarning) &&
                        <Text style={style.warning}>
                            {fileSizeWarning}
                        </Text>
                    }
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
