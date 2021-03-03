// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class ProfilePicture {
    testID = {
        userStatusIconPrefix: 'user_status.icon.',
    }

    getProfilePictureItemMatcher = (profilePictureSourcePrefix, userId) => {
        const profilePictureTestID = `${profilePictureSourcePrefix}${userId}`;
        return by.id(profilePictureTestID);
    }

    getProfilePictureItemUserStatusMatcher(profilePictureItemMatcher, userStatus = 'online') {
        const userStatusIconTestID = `${this.testID.userStatusIconPrefix}${userStatus}`;
        return by.id(userStatusIconTestID).withAncestor(profilePictureItemMatcher);
    }
}

const profilePicture = new ProfilePicture();
export default profilePicture;
