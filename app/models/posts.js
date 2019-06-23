// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export class Posts {
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
        name: 'Posts',
        primaryKey: 'id',
        properties: {
            id: 'string',
            createAt: {type: 'int', indexed: true},
            updateAt: {type: 'int', indexed: true},
            deleteAt: {type: 'int', default: 0},
            editAt: {type: 'int', default: 0},
            user: 'Users',
            rootId: 'string?',
            originalId: 'string',
            pendingPostId: 'string?',
            message: {type: 'string', default: ''},
            type: 'string?',
            props: 'string',
            files: 'Files[]',
            hasReactions: {type: 'bool', default: false},
            isPinned: {type: 'bool', default: false},
            metadata: 'Metadata[]',
            reactions: 'Reactions[]',
        },
    }
}

export class Metadata {
    get dataAsJson() {
        try {
            return JSON.parse(this.data);
        } catch {
            return null;
        }
    }

    static schema = {
        name: 'Metadata',
        primaryKey: 'hash',
        properties: {
            hash: 'string',
            url: {type: 'string', indexed: true},
            timestamp: 'int',
            type: {type: 'string', indexed: true},
            data: 'string',
        },
    }
}

export class Reactions {
    static schema = {
        name: 'Reactions',
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
            posts: 'Posts[]',
            firstPostId: 'string', // first post id in this block
            lastPostId: 'string', // last post id in this block
            startTime: 'int', // the first post in the block (createAt) >
            endTime: 'int', // the last post in the block (createAt) if next block startTime matches or is < endTime it would go to this block
            nextPostId: 'string?',
            previousPostId: 'string?',
        },
    }
}

export class PostsInThread {
    static schema = {
        name: 'PostsInThread',
        primaryKey: 'rootId',
        properties: {
            rootId: 'string',
            posts: 'Posts[]',
        },
    }
}

export class Files {
    static schema = {
        name: 'Files',
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
            posts: {type: 'linkingObjects', objectType: 'Posts', property: 'files'},
        },
    }
}
