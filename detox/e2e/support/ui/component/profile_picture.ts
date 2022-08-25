// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class ProfilePicture {
    testID = {
        userStatusIconPrefix: 'user_status.icon.',
    };

    getProfilePictureItemMatcher = (profilePictureSourcePrefix: string, userId: string) => {
        const profilePictureTestID = `${profilePictureSourcePrefix}${userId}.profile_picture`;
        return by.id(profilePictureTestID);
    };

    getProfilePictureItemUserStatusMatcher(profilePictureItemMatcher: Detox.NativeMatcher, userStatus = 'online') {
        const userStatusIconTestID = `${this.testID.userStatusIconPrefix}${userStatus}`;
        return by.id(userStatusIconTestID).withAncestor(profilePictureItemMatcher);
    }
}

const profilePicture = new ProfilePicture();
export default profilePicture;
