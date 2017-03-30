// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    View,
    TouchableOpacity
} from 'react-native';

import FileAttachment from './file_attachment';

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        fetchCache: PropTypes.object.isRequired,
        files: PropTypes.array.isRequired,
        hideOptionsContext: PropTypes.func.isRequired,
        onLongPress: PropTypes.func,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        toggleSelected: PropTypes.func.isRequired
    };

    componentDidMount() {
        const {post} = this.props;
        this.props.actions.loadFilesForPostIfNecessary(post);
    }

    handleOnPress = (file) => {
        this.props.hideOptionsContext();
        this.props.actions.goToImagePreviewModal(this.props.post, file.id);
    };

    render() {
        const fileAttachments = this.props.files.map((file) => (
            <TouchableOpacity
                key={file.id}
                onLongPress={this.props.onLongPress}
                onPress={() => this.handleOnPress(file)}
                onPressIn={() => this.props.toggleSelected(true)}
                onPressOut={() => this.props.toggleSelected(false)}
            >
                <FileAttachment
                    addFileToFetchCache={this.props.actions.addFileToFetchCache}
                    fetchCache={this.props.fetchCache}
                    file={file}
                    theme={this.props.theme}
                />
            </TouchableOpacity>
        ));

        return (
            <View style={{flex: 1}}>
                {fileAttachments}
            </View>
        );
    }
}
