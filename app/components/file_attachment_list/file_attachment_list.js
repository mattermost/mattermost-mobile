// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {
    Component,
    PropTypes
} from 'react';

import {
    View
} from 'react-native';

import FileAttachment from './file_attachment';

export default class FileAttachmentList extends Component {
    static propTypes = {
        actions: PropTypes.object.isRequired,
        post: PropTypes.object.isRequired,
        files: PropTypes.shape({
            files: PropTypes.object.isRequired,
            filesByPostId: PropTypes.object.isRequired
        }).isRequired
    };

    componentDidMount() {
        const {post} = this.props;
        this.props.actions.loadFilesForPostsIfNecessary(post);
    }

    render() {
        const files = this.props.files.filesByPostId[this.props.post.id] || [];
        const postFiles = files.map((file, i) => (
            <FileAttachment
                key={file.id}
                index={i}
                file={file}
            />
        ));

        return (
            <View>
                {postFiles}
            </View>
        );
    }
}
