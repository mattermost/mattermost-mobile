// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type VoiceRecordActionProps = {
    disabled: boolean;
    onUploadFiles: (files: ExtractedFileInfo[]) => void;
    testID: string;
}
