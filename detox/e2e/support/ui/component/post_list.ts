// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Post from './post';
import PostChannelInfo from './post_channel_info';

class PostList {
    testID: any;

    constructor(screenPrefix: string) {
        this.testID = {
            flatList: `${screenPrefix}post_list.flat_list`,
            moreMessagesButton: `${screenPrefix}post_list.more_messages_button`,
            newMessagesDivider: `${screenPrefix}post_list.new_messages_line`,
            threadOverview: `${screenPrefix}post_list.thread_overview`,
            threadOverviewRepliesCount: `${screenPrefix}post_list.replies_count`,
            threadOverviewNoReplies: `${screenPrefix}post_list.no_replies`,
            threadOverviewSaveButton: `${screenPrefix}post_list.thread_overview.save.button`,
            threadOverviewUnsaveButton: `${screenPrefix}post_list.thread_overview.unsave.button`,
            threadOverviewPostOptionsButton: `${screenPrefix}post_list.thread_overview.post_options.button`,
            postListPostItem: `${screenPrefix}post_list.post`,
            postListPostItemChannelInfo: `${screenPrefix}post_list.post_channel_info`,
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

    getThreadOverview = () => {
        return element(by.id(this.testID.threadOverview));
    };

    getThreadOverviewRepliesCount = () => {
        return element(by.id(this.testID.threadOverviewRepliesCount));
    };

    getThreadOverviewNoReplies = () => {
        return element(by.id(this.testID.threadOverviewNoReplies));
    };

    getThreadOverviewSaveButton = () => {
        return element(by.id(this.testID.threadOverviewSaveButton));
    };

    getThreadOverviewUnsaveButton = () => {
        return element(by.id(this.testID.threadOverviewUnsaveButton));
    };

    getThreadOverviewPostOptionsButton = () => {
        return element(by.id(this.testID.threadOverviewPostOptionsButton));
    };

    getPost = (postId: string, postMessage: string, postProfileOptions = {}) => {
        const {
            postItem,
            postItemBlockQuote,
            postItemBreak,
            postItemCheckbox,
            postItemCodeBlock,
            postItemCodeSpan,
            postItemEditedIndicator,
            postItemEmoji,
            postItemFooterFollowButton,
            postItemFooterFollowingButton,
            postItemFooterReplyCount,
            postItemHeaderCommentedOn,
            postItemHeaderDateTime,
            postItemHeaderDisplayName,
            postItemHeaderBotTag,
            postItemHeaderGuestTag,
            postItemHeaderAutoResponderTag,
            postItemHeaderReply,
            postItemHeaderReplyCount,
            postItemHeading,
            postItemHtml,
            postItemImage,
            postItemMessage,
            postItemLatexCodeBlock,
            postItemInlineLatex,
            postItemLink,
            postItemListItem,
            postItemListItemBullet,
            postItemParagraph,
            postItemPreHeaderText,
            postItemProfilePicture,
            postItemProfilePictureUserStatus,
            postItemShowLessButton,
            postItemShowMoreButton,
            postItemTable,
            postItemTableCell,
            postItemTableExpandButton,
            postItemTableImage,
            postItemTableRow,
            postItemThematicBreak,
            postItemUnreadDotBadge,
        } = Post.getPost(this.testID.postListPostItem, postId, postMessage, postProfileOptions);
        const {
            postItemChannelInfoChannelDisplayName,
            postItemChannelInfoTeamDisplayName,
        } = PostChannelInfo.getPostChannelInfo(this.testID.postListPostItemChannelInfo, postId);

        return {
            postListPostItem: postItem,
            postListPostItemBlockQuote: postItemBlockQuote,
            postListPostItemBreak: postItemBreak,
            postListPostItemChannelInfoChannelDisplayName: postItemChannelInfoChannelDisplayName,
            postListPostItemChannelInfoTeamDisplayName: postItemChannelInfoTeamDisplayName,
            postListPostItemCheckbox: postItemCheckbox,
            postListPostItemCodeBlock: postItemCodeBlock,
            postListPostItemCodeSpan: postItemCodeSpan,
            postListPostItemEditedIndicator: postItemEditedIndicator,
            postListPostItemEmoji: postItemEmoji,
            postListPostItemFooterFollowButton: postItemFooterFollowButton,
            postListPostItemFooterFollowingButton: postItemFooterFollowingButton,
            postListPostItemFooterReplyCount: postItemFooterReplyCount,
            postListPostItemHeaderCommentedOn: postItemHeaderCommentedOn,
            postListPostItemHeaderDateTime: postItemHeaderDateTime,
            postListPostItemHeaderDisplayName: postItemHeaderDisplayName,
            postListPostItemHeaderBotTag: postItemHeaderBotTag,
            postListPostItemHeaderGuestTag: postItemHeaderGuestTag,
            postListPostItemHeaderAutoResponderTag: postItemHeaderAutoResponderTag,
            postListPostItemHeaderReply: postItemHeaderReply,
            postListPostItemHeaderReplyCount: postItemHeaderReplyCount,
            postListPostItemHeading: postItemHeading,
            postListPostItemHtml: postItemHtml,
            postListPostItemImage: postItemImage,
            postListPostItemMessage: postItemMessage,
            postListPostItemLatexCodeBlock: postItemLatexCodeBlock,
            postListPostItemInlineLatex: postItemInlineLatex,
            postListPostItemLink: postItemLink,
            postListPostItemListItem: postItemListItem,
            postListPostItemListItemBullet: postItemListItemBullet,
            postListPostItemParagraph: postItemParagraph,
            postListPostItemPreHeaderText: postItemPreHeaderText,
            postListPostItemProfilePicture: postItemProfilePicture,
            postListPostItemProfilePictureUserStatus: postItemProfilePictureUserStatus,
            postListPostItemShowLessButton: postItemShowLessButton,
            postListPostItemShowMoreButton: postItemShowMoreButton,
            postListPostItemTable: postItemTable,
            postListPostItemTableCell: postItemTableCell,
            postListPostItemTableExpandButton: postItemTableExpandButton,
            postListPostItemTableImage: postItemTableImage,
            postListPostItemTableRow: postItemTableRow,
            postListPostItemThematicBreak: postItemThematicBreak,
            postListPostItemUnreadDotBadge: postItemUnreadDotBadge,
        };
    };

    getPostMessageAtIndex = (index: number) => {
        return Post.getPostMessage(this.testID.postListPostItem).atIndex(index);
    };
}

export default PostList;
