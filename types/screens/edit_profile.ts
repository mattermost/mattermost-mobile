// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AvailableScreens} from './navigation';
import type {FloatingTextInputRef} from '@components/floating_text_input_label';
import type {FieldProps} from '@screens/edit_profile/components/field';
import type UserModel from '@typings/database/models/servers/user';
import type {RefObject} from 'react';

export interface UserInfo extends Record<string, string | undefined | null| boolean> {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
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
};

export type NewProfileImage = { localPath?: string; isRemoved?: boolean };

export type FieldSequence = Record<string, {
    ref: RefObject<FloatingTextInputRef>;
    isDisabled: boolean;
}>

export type FieldConfig = Pick<FieldProps, 'blurOnSubmit' | 'enablesReturnKeyAutomatically' | 'onFocusNextField' | 'onTextChange' | 'returnKeyType'>

