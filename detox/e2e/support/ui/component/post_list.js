// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Post from './post';

class PostList {
    constructor(screenPrefix) {
        this.testID = {
            moreMessagesButton: `${screenPrefix}post_list.more_messages_button`,
            newMessagesDivider: `${screenPrefix}post_list.new_messages_divider`,
            postListPostItem: `${screenPrefix}post_list.post`,
        };
    }

    getMoreMessagesButton = () => {
        return element(by.id(this.testID.moreMessagesButton));
    }

    getNewMessagesDivider = () => {
        return element(by.id(this.testID.newMessagesDivider));
    }

    getPost = (postId, postMessage, postProfileOptions = {}) => {
        const {
            postItem,
            postItemBlockQuote,
            postItemEmoji,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
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
            postListPostItemHeaderDateTime: postItemHeaderDateTime,
            postListPostItemHeaderDisplayName: postItemHeaderDisplayName,
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
    }

    getPostMessageAtIndex = (index) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    }
}

export default PostList;
