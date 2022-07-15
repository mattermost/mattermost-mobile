// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class PostChannelInfo {
    testID = {
        channelDisplayName: 'channel_display_name',
        teamDisplayName: 'team_display_name',
    };

    getPostChannelInfo = (postItemChannelInfoSourceTestID: string, postId: string) => {
        const postItemChannelInfoMatcher = by.id(`${postItemChannelInfoSourceTestID}.${postId}`);
        const postItemChannelInfoChannelDisplayNameMatcher = by.id(this.testID.channelDisplayName).withAncestor(postItemChannelInfoMatcher);
        const postItemChannelInfoTeamDisplayNameMatcher = by.id(this.testID.teamDisplayName).withAncestor(postItemChannelInfoMatcher);

        return {
            postItemChannelInfo: element(postItemChannelInfoMatcher),
            postItemChannelInfoChannelDisplayName: element(postItemChannelInfoChannelDisplayNameMatcher),
            postItemChannelInfoTeamDisplayName: element(postItemChannelInfoTeamDisplayNameMatcher),
        };
    };
}

const postChannelInfo = new PostChannelInfo();
export default postChannelInfo;
