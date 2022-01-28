// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RefObject} from 'react';

import {FloatingTextInputRef} from '@components/floating_text_input_label';
import {FieldProps} from '@screens/edit_profile/components/field';

import type UserModel from '@typings/database/models/servers/user';

interface UserInfo extends Record<string, string | undefined | null| boolean> {
    email: string;
    firstName: string;
    lastName: string;
    nickname: string;
    position: string;
    username: string;
}

type EditProfileProps = {
    componentId: string;
    currentUser: UserModel;
    isModal?: boolean;
    isTablet?: boolean;
    lockedFirstName: boolean;
    lockedLastName: boolean;
    lockedNickname: boolean;
    lockedPosition: boolean;
    lockedPicture: boolean;
};

type NewProfileImage = { localPath?: string; isRemoved?: boolean };

type FieldSequence = Record<string, {
    ref: RefObject<FloatingTextInputRef>;
    isDisabled: boolean;
}>

type FieldConfig = Pick<FieldProps, 'blurOnSubmit' | 'enablesReturnKeyAutomatically' | 'onFocusNextField' | 'onTextChange' | 'returnKeyType'>

