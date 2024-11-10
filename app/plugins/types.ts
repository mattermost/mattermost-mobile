// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ClientResponse, RequestOptions} from '@mattermost/react-native-network-client';
import type {Component} from 'react';

type BuildRequestCallback = (url: string, options?: RequestOptions) => Promise<ClientResponse>;

type VerifyCallback = (response: ClientResponse) => Promise<boolean>;

export type PluginType = 'post' | 'default';

export type PluginSource = {
    readonly uri: string;
    readonly options?: RequestOptions;
};

export type PluginResponse = {
    data?: Record<string, unknown> | string;
    code: number;
}

export type PluginCache = Map<string, string>;

export type PluginOngoingRequests = Map<string, Promise<PluginResponse>>;

export type PluginContextConfig = {
    readonly verify: VerifyCallback;
    readonly buildRequestForUri?: BuildRequestCallback;
    readonly global?: any;
}

export type PluginRequestFactory = {
    readonly buildRequestForUri: BuildRequestCallback;
    readonly verify: VerifyCallback;
}

export type PluginFactory = {
    readonly shouldCreateComponent: (src: string, type: PluginType) => Promise<Component>;
    readonly shouldRequestPlugin: (source: PluginSource) => Promise<PluginResponse>;
}

