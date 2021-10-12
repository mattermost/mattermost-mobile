// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';

type UploadedFile = {
    fileName: string;
    fileSize: number;
    height: number;
    type: typeof VALID_MIME_TYPES[number];
    uri: string;
    width: number;
}

interface UserInfo extends Record<string, string | undefined | null| boolean> {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
}
