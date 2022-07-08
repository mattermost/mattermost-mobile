// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import ProfilePicture from './profile_picture';

class Post {
    testID = {
        postAvatarPrefix: 'post_avatar.',
        blockQuote: 'markdown_block_quote',
        break: 'markdown_break',
        checkbox: 'markdown_checkbox',
        codeBlock: 'markdown_code_block',
        codeSpan: 'markdown_code_span',
        editedIndicator: 'edited_indicator',
        emoji: 'markdown_emoji',
        heading: 'markdown_heading',
        html: 'markdown_html',
        image: 'markdown_image',
        message: 'markdown_text',
        latexCodeBlock: 'markdown_latex_code_block',
        latexInLine: 'markdown_latex_inline',
        link: 'markdown_link',
        listItem: 'markdown_list_item',
        listItemBullet: 'markdown_list_item.bullet',
        paragraph: 'markdown_paragraph',
        postFooterFollowButton: 'post_footer.follow_thread.button',
        postFooterFollowingButton: 'post_footer.following_thread.button',
        postFooterReplyCount: 'post_footer.reply_count',
        postHeaderCommentedOn: 'post_header.commented_on',
        postHeaderDateTime: 'post_header.date_time',
        postHeaderDisplayName: 'post_header.display_name',
        postHeaderBotTag: 'post_header.bot.tag',
        postHeaderGuestTag: 'post_header.guest.tag',
        postHeaderAutoResponderTag: 'post_header.auto_responder.tag',
        postHeaderReply: 'post_header.reply',
        postHeaderReplyCount: 'post_header.reply_count',
        postPreHeaderText: 'post_pre_header.text',
        postUnreadDotBadge: 'post_unread_dot.badge',
        showLessButton: 'show_more.button.chevron-up',
        showMoreButton: 'show_more.button.chevron-down',
        table: 'markdown_table',
        tableCell: 'markdown_table_cell',
        tableExpandButton: 'markdown_table.expand.button',
        tableImage: 'markdown_table_image',
        tableRow: 'markdown_table_row',
        thematicBreak: 'markdown_thematic_break',
    };

    getPost = (postItemSourceTestID: string, postId: string, postMessage: string, postProfileOptions: any = {}) => {
        const postItemMatcher = this.getPostItemMatcher(postItemSourceTestID, postId, postMessage);
        const postItemBlockQuoteMatcher = by.id(this.testID.blockQuote).withAncestor(postItemMatcher);
        const postItemBreakMatcher = by.id(this.testID.break).withAncestor(postItemMatcher);
        const postItemCheckboxMatcher = by.id(this.testID.checkbox).withAncestor(postItemMatcher);
        const postItemCodeBlockMatcher = by.id(this.testID.codeBlock).withAncestor(postItemMatcher);
        const postItemCodeSpanMatcher = by.id(this.testID.codeSpan).withAncestor(postItemMatcher);
        const postItemEditedIndicator = by.id(this.testID.editedIndicator).withAncestor(postItemMatcher);
        const postItemEmojiMatcher = by.id(this.testID.emoji).withAncestor(postItemMatcher);
        const postItemHeadingMatcher = by.id(this.testID.heading).withAncestor(postItemMatcher);
        const postItemHtmlMatcher = by.id(this.testID.html).withAncestor(postItemMatcher);
        const postItemImageMatcher = by.id(this.testID.image).withAncestor(postItemMatcher);
        const postItemMessageMatcher = by.id(this.testID.message).withAncestor(postItemMatcher);
        const postItemLatexCodeBlockMatcher = by.id(this.testID.latexCodeBlock).withAncestor(postItemMatcher);
        const postItemInlineLatexMatcher = by.id(this.testID.latexInLine).withAncestor(postItemMatcher);
        const postItemLinkMatcher = by.id(this.testID.link).withAncestor(postItemMatcher);
        const postItemListItemMatcher = by.id(this.testID.listItem).withAncestor(postItemMatcher);
        const postItemListItemBulletMatcher = by.id(this.testID.listItemBullet).withAncestor(postItemMatcher);
        const postItemParagraphMatcher = by.id(this.testID.paragraph).withAncestor(postItemMatcher);
        const postItemPreHeaderTextMatch = by.id(this.testID.postPreHeaderText).withAncestor(postItemMatcher);
        const postItemShowLessButtonMatcher = by.id(this.testID.showLessButton).withAncestor(postItemMatcher);
        const postItemShowMoreButtonMatcher = by.id(this.testID.showMoreButton).withAncestor(postItemMatcher);
        const postItemTableMatcher = by.id(this.testID.table).withAncestor(postItemMatcher);
        const postItemTableCellMatcher = by.id(this.testID.tableCell).withAncestor(postItemMatcher);
        const postItemTableExpandButtonMatcher = by.id(this.testID.tableExpandButton).withAncestor(postItemMatcher);
        const postItemTableImageMatcher = by.id(this.testID.tableImage).withAncestor(postItemMatcher);
        const postItemTableRowMatcher = by.id(this.testID.tableRow).withAncestor(postItemMatcher);
        const postItemThematicBreakMatcher = by.id(this.testID.thematicBreak).withAncestor(postItemMatcher);
        const postItemUnreadDotBadgeMatcher = by.id(this.testID.postUnreadDotBadge).withAncestor(postItemMatcher);

        return {
            postItem: element(postItemMatcher),
            postItemBlockQuote: element(postItemBlockQuoteMatcher),
            postItemBreak: element(postItemBreakMatcher),
            postItemCheckbox: element(postItemCheckboxMatcher),
            postItemCodeBlock: element(postItemCodeBlockMatcher),
            postItemCodeSpan: element(postItemCodeSpanMatcher),
            postItemEditedIndicator: element(postItemEditedIndicator),
            postItemEmoji: element(postItemEmojiMatcher),
            postItemHeading: element(postItemHeadingMatcher),
            postItemHtml: element(postItemHtmlMatcher),
            postItemImage: element(postItemImageMatcher),
            postItemMessage: element(postItemMessageMatcher),
            postItemLatexCodeBlock: element(postItemLatexCodeBlockMatcher),
            postItemInlineLatex: element(postItemInlineLatexMatcher),
            postItemLink: element(postItemLinkMatcher),
            postItemListItem: element(postItemListItemMatcher),
            postItemListItemBullet: element(postItemListItemBulletMatcher),
            postItemParagraph: element(postItemParagraphMatcher),
            postItemPreHeaderText: element(postItemPreHeaderTextMatch),
            postItemShowLessButton: element(postItemShowLessButtonMatcher),
            postItemShowMoreButton: element(postItemShowMoreButtonMatcher),
            postItemTable: element(postItemTableMatcher),
            postItemTableCell: element(postItemTableCellMatcher),
            postItemTableExpandButton: element(postItemTableExpandButtonMatcher),
            postItemTableImage: element(postItemTableImageMatcher),
            postItemTableRow: element(postItemTableRowMatcher),
            postItemThematicBreak: element(postItemThematicBreakMatcher),
            postItemUnreadDotBadge: element(postItemUnreadDotBadgeMatcher),
            ...this.getPostFooter(postItemMatcher),
            ...this.getPostHeader(postItemMatcher),
            ...this.getPostProfilePicture(postItemMatcher, postProfileOptions),
        };
    };

    getPostFooter = (postItemMatcher: Detox.NativeMatcher) => {
        const postItemFooterFollowButtonMatcher = by.id(this.testID.postFooterFollowButton).withAncestor(postItemMatcher);
        const postItemFooterFollowingButtonMatcher = by.id(this.testID.postFooterFollowingButton).withAncestor(postItemMatcher);
        const postItemFooterReplyCountMatcher = by.id(this.testID.postFooterReplyCount).withAncestor(postItemMatcher);

        return {
            postItemFooterFollowButton: element(postItemFooterFollowButtonMatcher),
            postItemFooterFollowingButton: element(postItemFooterFollowingButtonMatcher),
            postItemFooterReplyCount: element(postItemFooterReplyCountMatcher),
        };
    };

    getPostHeader = (postItemMatcher: Detox.NativeMatcher) => {
        const postItemHeaderCommentedOnMatcher = by.id(this.testID.postHeaderCommentedOn).withAncestor(postItemMatcher);
        const postItemHeaderDateTimeMatcher = by.id(this.testID.postHeaderDateTime).withAncestor(postItemMatcher);
        const postItemHeaderDisplayNameMatcher = by.id(this.testID.postHeaderDisplayName).withAncestor(postItemMatcher);
        const postItemHeaderBotTagMatcher = by.id(this.testID.postHeaderBotTag).withAncestor(postItemMatcher);
        const postItemHeaderGuestTagMatcher = by.id(this.testID.postHeaderGuestTag).withAncestor(postItemMatcher);
        const postItemHeaderAutoResponderTagMatcher = by.id(this.testID.postHeaderAutoResponderTag).withAncestor(postItemMatcher);
        const postItemHeaderReplyMatcher = by.id(this.testID.postHeaderReply).withAncestor(postItemMatcher);
        const postItemHeaderReplyCountMatcher = by.id(this.testID.postHeaderReplyCount).withAncestor(postItemMatcher);

        return {
            postItemHeaderCommentedOn: element(postItemHeaderCommentedOnMatcher),
            postItemHeaderDateTime: element(postItemHeaderDateTimeMatcher),
            postItemHeaderDisplayName: element(postItemHeaderDisplayNameMatcher),
            postItemHeaderBotTag: element(postItemHeaderBotTagMatcher),
            postItemHeaderGuestTag: element(postItemHeaderGuestTagMatcher),
            postItemHeaderAutoResponderTag: element(postItemHeaderAutoResponderTagMatcher),
            postItemHeaderReply: element(postItemHeaderReplyMatcher),
            postItemHeaderReplyCount: element(postItemHeaderReplyCountMatcher),
        };
    };

    getPostItemMatcher = (postItemSourceTestID: string, postId: string, postMessage: string) => {
        const postTestID = `${postItemSourceTestID}.${postId}`;
        const baseMatcher = by.id(postTestID);
        return postMessage ? baseMatcher.withDescendant(by.text(postMessage)) : baseMatcher;
    };

    getPostMessage = (postItemSourceTestID: string) => {
        return element(by.id(this.testID.message).withAncestor(by.id(postItemSourceTestID)));
    };

    getPostProfilePicture = (postItemMatcher: Detox.NativeMatcher, postProfileOptions = {userId: null, userStatus: 'online'}) => {
        if (Object.keys(postProfileOptions).length === 0 || !postProfileOptions.userId) {
            return {
                postItemProfilePicture: null,
                postItemProfilePictureUserStatus: null,
            };
        }

        const profilePictureItemMatcher = ProfilePicture.getProfilePictureItemMatcher(this.testID.postAvatarPrefix, postProfileOptions.userId);
        const profilePictureItemUserStatusMatcher = ProfilePicture.getProfilePictureItemUserStatusMatcher(profilePictureItemMatcher, postProfileOptions.userStatus);
        const postItemProfilePictureMatcher = profilePictureItemMatcher.withAncestor(postItemMatcher);
        const postItemProfilePictureUserStatusMatcher = profilePictureItemUserStatusMatcher.withAncestor(postItemMatcher);

        return {
            postItemProfilePicture: element(postItemProfilePictureMatcher),
            postItemProfilePictureUserStatus: element(postItemProfilePictureUserStatusMatcher),
        };
    };
}

const post = new Post();
export default post;
