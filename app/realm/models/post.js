// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Realm from 'realm';

export class Post extends Realm.Object {
    get propsAsJson() {
        try {
            return JSON.parse(this.props);
        } catch {
            return null;
        }
    }

    static schema = {
        name: 'Post',
        primaryKey: 'id',
        properties: {
            id: 'string',
            channelId: {type: 'string', indexed: true},
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

export class Reaction extends Realm.Object {
    static schema = {
        name: 'Reaction',
        primaryKey: 'id',
        properties: {
            id: 'string', // {postId}-{userId}-{emojiName}
            user: 'string',
            name: 'string',
            createAt: 'int',
        },
    }
}

export class File extends Realm.Object {
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

export class ImageMetadata extends Realm.Object {
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

export class Embed extends Realm.Object {
    get dataAsJson() {
        try {
            return JSON.parse(this.data);
        } catch {
            return null;
        }
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

export class PostsTimesInChannel extends Realm.Object {
    static schema = {
        name: 'PostsTimesInChannel',
        properties: {
            channelId: 'string',
            start: 'int',
            end: 'int',
        },
    }
}
