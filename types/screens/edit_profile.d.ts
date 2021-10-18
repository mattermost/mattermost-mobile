// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TextStyle} from 'react-native';

import {VALID_MIME_TYPES} from '@screens/edit_profile/constants';

interface UserInfo extends Record<string, string | undefined | null| boolean> {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
}

export type FileResponse = {
    assets?: File[];
    didCancel?: boolean;
    error?: Error;
};

export type File = {
    fileName?: string;
    fileSize?: number;
    height?: number;
    name?: string;
    path?: string;
    type: typeof VALID_MIME_TYPES[number];
    uri: string;
    width?: number;
};

export type ExtraOptions = {
    action: () => void;
    text: {
        id: string;
        defaultMessage: string;
    };
    textStyle: TextStyle;
    icon: string;
    iconStyle: TextStyle;
}
