// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Post from './post';

class PostList {
    testID: any;

    constructor(screenPrefix: string) {
        this.testID = {
            flatList: `${screenPrefix}post_list.flat_list`,
            moreMessagesButton: `${screenPrefix}post_list.more_messages_button`,
            newMessagesDivider: `${screenPrefix}post_list.new_messages_line`,
            postListPostItem: `${screenPrefix}post_list.post`,
        };
    }

    getFlatList = () => {
        return element(by.id(this.testID.flatList));
    };

    getMoreMessagesButton = () => {
        return element(by.id(this.testID.moreMessagesButton));
    };

    getNewMessagesDivider = () => {
        return element(by.id(this.testID.newMessagesDivider));
    };

    getPost = (postId: string, postMessage: string, postProfileOptions = {}) => {
        const {
            postItem,
            postItemBlockQuote,
            postItemEmoji,
            postItemHeaderCommentedOn,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
            postItemHeaderBotTag,
            postItemHeaderGuestTag,
            postItemHeaderReply,
            postItemHeaderReplyCount,
            postItemImage,
            postItemMessage,
            postItemPreHeaderText,
            postItemProfilePicture,
            postItemProfilePictureUserStatus,
            postItemShowLessButton,
            postItemShowMoreButton,
            postItemTable,
            postItemTableExpandButton,
            postItemThematicBreak,
        } = Post.getPost(this.testID.postListPostItem, postId, postMessage, postProfileOptions);

        return {
            postListPostItem: postItem,
            postListPostItemBlockQuote: postItemBlockQuote,
            postListPostItemEmoji: postItemEmoji,
            postListPostItemHeaderCommentedOn: postItemHeaderCommentedOn,
            postListPostItemHeaderDateTime: postItemHeaderDateTime,
            postListPostItemHeaderDisplayName: postItemHeaderDisplayName,
            postListPostItemHeaderBotTag: postItemHeaderBotTag,
            postListPostItemHeaderGuestTag: postItemHeaderGuestTag,
            postListPostItemHeaderReply: postItemHeaderReply,
            postListPostItemHeaderReplyCount: postItemHeaderReplyCount,
            postListPostItemImage: postItemImage,
            postListPostItemMessage: postItemMessage,
            postListPostItemPreHeaderText: postItemPreHeaderText,
            postListPostItemProfilePicture: postItemProfilePicture,
            postListPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
            postListPostItemShowLessButton: postItemShowLessButton,
            postListPostItemShowMoreButton: postItemShowMoreButton,
            postListPostItemTable: postItemTable,
            postListPostItemTableExpandButton: postItemTableExpandButton,
            postListPostItemThematicBreak: postItemThematicBreak,
        };
    };

    getPostMessageAtIndex = (index: number) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    };
}

export default PostList;
