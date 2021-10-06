// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {t} from '@i18n';

export const MAX_SIZE = 20 * 1024 * 1024;

export const VALID_MIME_TYPES = [
    'image/jpeg',
    'image/jpeg',
    'image/jpg',
    'image/jp_',
    'application/jpg',
    'application/x-jpg',
    'image/pjpeg',
    'image/pipeg',
    'image/vnd.swiftview-jpeg',
    'image/x-xbitmap',
    'image/png',
    'application/png',
    'application/x-png',
    'image/bmp',
    'image/x-bmp',
    'image/x-bitmap',
    'image/x-xbitmap',
    'image/x-win-bitmap',
    'image/x-windows-bmp',
    'image/ms-bmp',
    'image/x-ms-bmp',
    'application/bmp',
    'application/x-bmp',
    'application/x-win-bitmap',
];

export const HOLDERS: { [id: string]: any } = {
    firstName: {
        id: t('user.settings.general.firstName'),
        defaultMessage: 'First Name',
    },
    lastName: {
        id: t('user.settings.general.lastName'),
        defaultMessage: 'Last Name',
    },
    username: {
        id: t('user.settings.general.username'),
        defaultMessage: 'Username',
    },
    nickname: {
        id: t('user.settings.general.nickname'),
        defaultMessage: 'Nickname',
    },
    position: {
        id: t('user.settings.general.position'),
        defaultMessage: 'Position',
    },
    email: {
        id: t('user.settings.general.email'),
        defaultMessage: 'Email',
    },
};
