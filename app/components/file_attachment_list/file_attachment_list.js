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
        post: PropTypes.object.isRequired,
        files: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired
    };

    componentDidMount() {
        const {post} = this.props;
        this.props.actions.loadFilesForPostIfNecessary(post);
    }

    render() {
        const fileAttachments = this.props.files.map((file) => (
            <TouchableOpacity
                key={file.id}
                onPress={() => this.props.actions.goToImagePreviewModal(this.props.post, file.id)}
            >
                <FileAttachment
                    file={file}
                    theme={this.props.theme}
                />
            </TouchableOpacity>
        ));

        return (
            <View>
                {fileAttachments}
            </View>
        );
    }
}
