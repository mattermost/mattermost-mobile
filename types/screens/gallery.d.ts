// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {StyleProp, ViewStyle} from 'react-native';

import type {FileInfo} from '@mm-redux/types/files';
import type {Theme} from '@mm-redux/types/preferences';

export interface ActionCallback {
    (callback: CallbackFunctionWithoutArguments): void;
}

export interface ActionProps {
    action: (callback: CallbackFunctionWithoutArguments) => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    visible: boolean;
}

export interface ActionsProps {
    canDownloadFiles: boolean;
    downloadAction: ActionCallback;
    file: FileInfo;
    linkAction: ActionCallback;
}

export interface AvatarProps {
    avatarUri?: string;
}

export interface CallbackFunctionWithoutArguments {
    (): void;
}

export interface DetailsProps {
    channel?: string;
    isDirect?: boolean;
    ownPost?: boolean;
    user?: string;
}

export interface DownloadRef {
    start(file: FileInfo): Promise<void>;
}

export interface FooterProps {
    intl: typeof intlShape;
    file: FileInfo;
}

export interface FooterRef {
    toggle(): boolean;
}

export interface ManagedConfig {
    [key: string]: string;
}

export interface ShowToast {
    (text: string, duration?: number, callback?: () => void): void;
}

export interface SummaryProps {
    avatarUri?: string;
    channelName?: string;
    copyPublicLink: ActionCallback;
    displayName?: string;
    dowloadFile: ActionCallback;
    file: FileInfo;
    isDirectChannel: boolean;
    isLandscape: boolean;
    ownPost: boolean;
}

export interface ToastProps {
    theme: Theme;
}

export interface ToastRef {
    show: ShowToast
}

export interface ToastState {
    animation?: CompositeAnimation,
    duration?: number;
    callback?: () => void;
}
