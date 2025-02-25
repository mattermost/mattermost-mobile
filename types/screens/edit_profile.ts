// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AvailableScreens} from './navigation';
import type {FieldProps} from '@screens/edit_profile/components/field';
import type {CustomAttributeSet} from '@typings/api/custom_profile_attributes';
import type UserModel from '@typings/database/models/servers/user';

export interface UserInfo {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
    customAttributes: CustomAttributeSet;
}

export type EditProfileProps = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    isModal?: boolean;
    isTablet?: boolean;
    lockedFirstName: boolean;
    lockedLastName: boolean;
    lockedNickname: boolean;
    lockedPosition: boolean;
    lockedPicture: boolean;
    enableCustomAttributes: boolean;
};

export type NewProfileImage = { localPath?: string; isRemoved?: boolean };

export type FieldSequence = Record<string, {
    isDisabled: boolean;
    maxLength?: number;
    error?: string;
}>

export type FieldConfig = Pick<FieldProps, 'blurOnSubmit' | 'enablesReturnKeyAutomatically' | 'onFocusNextField' | 'onTextChange' | 'returnKeyType'>

