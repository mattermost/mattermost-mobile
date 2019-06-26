// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export class Post {
    get propsAsJson() {
        try {
            return JSON.parse(this.props);
        } catch {
            return null;
        }
    }

    set propsFromJson(props) {
        this.props = JSON.stringify(props);
    }

    static schema = {
        name: 'Post',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: {type: 'int', indexed: true},
            updateAt: {type: 'int', indexed: true},
            deleteAt: {type: 'int', default: 0},
            editAt: {type: 'int', default: 0},
            user: 'User',
            rootId: 'string?',
            originalId: 'string',
            pendingPostId: 'string?',
            message: {type: 'string', default: ''},
            type: 'string?',
            props: 'string',
            embeds: 'Embed[]',
            files: 'File[]',
            hasReactions: {type: 'bool', default: false},
            isPinned: {type: 'bool', default: false},
            images: 'ImageMetadata[]',
            reactions: 'Reaction[]',
        },
    }
}

export class Reaction {
    static schema = {
        name: 'Reaction',
        primaryKey: 'id',
        properties: {
            id: 'string', // {postId}-{userId}-{emojiName}
            user: 'User',
            name: 'string',
            createAt: 'int',
        },
    }
}

export class PostsInChannel {
    static schema = {
        name: 'PostsInChannel',
        properties: {
            channelId: 'string',
            posts: 'Post[]',
            firstPostId: 'string', // first post id in this block
            lastPostId: 'string', // last post id in this block
            startTime: 'int', // the first post in the block (createAt) >
            endTime: 'int', // the last post in the block (createAt) if next block startTime matches or is < endTime it would go to this block
            nextPostId: 'string?',
            previousPostId: 'string?',
        },
    }
}

export class File {
    static schema = {
        name: 'File',
        primaryKey: 'id',
        properties: {
            id: 'string',
            name: 'string',
            extension: 'string',
            mimeType: 'string',
            size: 'int',
            createAt: 'int',
            updateAt: 'int',
            deleteAt: 'int',
            width: 'int',
            height: 'int',
            hasPreviewImage: 'bool',
            posts: {type: 'linkingObjects', objectType: 'Post', property: 'files'},
        },
    }
}

export class ImageMetadata {
    static schema = {
        name: 'ImageMetadata',
        primaryKey: 'url',
        properties: {
            url: 'string',
            width: 'int',
            height: 'int',
            format: 'string',
            frameCount: 'int',
        },
    }
}

export class Embed {
    get dataAsJson() {
        try {
            return JSON.parse(this.data);
        } catch {
            return null;
        }
    }

    set dataFromJson(data) {
        this.props = JSON.stringify(data);
    }

    static schema = {
        name: 'Embed',
        properties: {
            type: 'string',
            url: 'string',
            data: 'string?',
        },
    }
}

{embeds: [{type, url}]}
