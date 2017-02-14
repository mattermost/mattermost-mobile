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
            fileIdsByPostId: PropTypes.object.isRequired
        }).isRequired
    };

    componentDidMount() {
        const {post} = this.props;
        this.props.actions.loadFilesForPostsIfNecessary(post);
    }

    render() {
        const {files: allFiles, fileIdsByPostId} = this.props.files;
        const fileIdsForPost = fileIdsByPostId[this.props.post.id] || [];
        const filesForPost = fileIdsForPost.map((fileId) => allFiles[fileId]);
        const fileAttachments = filesForPost.map((file, i) => (
            <FileAttachment
                key={file.id}
                index={i}
                file={file}
            />
        ));

        return (
            <View>
                {fileAttachments}
            </View>
        );
    }
}
