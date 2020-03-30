// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config} from './config';

export type GeneralState = {
    appState: boolean;
    credentials: any;
    config: Partial<Config>;
    dataRetentionPolicy: any;
    deviceToken: string;
    license: any;
    serverVersion: string;
    timezones: Array<string>;
};
