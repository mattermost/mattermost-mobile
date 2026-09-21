// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

class AttachmentOptions {
    testID = {
        photoLibrary: 'file_attachment.photo_library',
        attachFile: 'file_attachment.attach_file',
    };

    photoLibrary = element(by.id(this.testID.photoLibrary));
    attachFile = element(by.id(this.testID.attachFile));
}

const attachmentOptions = new AttachmentOptions();
export default attachmentOptions;
