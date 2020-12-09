// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppCallResponseType, AppCallType, AppExpandLevel, AppFieldType} from '@mm-redux/types/apps';

export const AppsBindings = {
    POST_MENU_ITEM: '/post_menu',
    CHANNEL_HEADER_ICON: '/channel_header',
    COMMAND: '/command',
    IN_POST: '/in_post',
};

export const AppCallResponseTypes: { [name: string]: AppCallResponseType } = {
    OK: '',
    ERROR: 'error',
    FORM: 'form',
    CALL: 'call',
    NAVIGATE: 'navigate',
};

export const AppCallTypes: { [name: string]: AppCallType } = {
    SUBMIT: '',
    FORM: 'form',
    CANCEL: 'cancel',
};

export const AppExpandLevels: { [name: string]: AppExpandLevel } = {
    EXPAND_ALL: 'All',
    EXPAND_SUMMARY: 'Summary',
};

export const AppFieldTypes: { [name: string]: AppFieldType } = {
    TEXT: 'text',
    STATIC_SELECT: 'static_select',
    DYNAMIC_SELECT: 'dynamic_select',
    BOOL: 'bool',
    USER: 'user',
    CHANNEL: 'channel',
};
