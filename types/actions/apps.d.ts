// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppCallRequest, AppCallResponse, AppContext} from '@mm-redux/types/apps';
import {Post} from '@mm-redux/types/posts';

export type DoAppCallResult<Res=unknown> = {
    data?: AppCallResponse<Res>;
    error?: AppCallResponse<Res>;
}

export interface PostEphemeralCallResponseForPost {
    (response: AppCallResponse, message: string, post: Post): void;
}

export interface PostEphemeralCallResponseForChannel {
    (response: AppCallResponse, message: string, channelID: string): void;
}

export interface PostEphemeralCallResponseForContext {
    (response: AppCallResponse, message: string, context: AppContext): void;
}

export interface HandleBindingClick<Res=unknown> {
    (binding: AppBinding, context: AppContext, intl: any): Promise<DoAppCallResult<Res>>;
}

export interface DoAppSubmit<Res=unknown> {
    (call: AppCallRequest, intl: any): Promise<DoAppCallResult<Res>>;
}

export interface DoAppFetchForm<Res=unknown> {
    (call: AppCallRequest, intl: any): Promise<DoAppCallResult<Res>>;
}

export interface DoAppLookup<Res=unknown> {
    (call: AppCallRequest, intl: any): Promise<DoAppCallResult<Res>>;
}
