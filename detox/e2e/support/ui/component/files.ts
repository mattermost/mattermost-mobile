// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// testIDs are defined in:
// - app/components/post_list/post/body/redacted_files_placeholder/index.tsx
// - app/components/post_list/post/body/unverified_files_placeholder/index.tsx
// - app/components/files/files.tsx (`${file.id}-file-container`)

class Files {
    testID = {
        redactedFilesPlaceholder: 'redacted-files-placeholder',
        unverifiedFilesPlaceholder: 'unverified-files-placeholder',
    };

    redactedFilesPlaceholder = element(by.id(this.testID.redactedFilesPlaceholder));
    unverifiedFilesPlaceholder = element(by.id(this.testID.unverifiedFilesPlaceholder));

    // `-file-container`, not `-file`: .txt attachments (and other non-image/video files)
    // only carry the `-file-container` testID. Image and video files also carry `-file`.
    getFileContainer = (fileId: string) => element(by.id(`${fileId}-file-container`));
}

const files = new Files();
export default files;
