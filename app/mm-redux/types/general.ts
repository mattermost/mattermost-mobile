// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Config} from './config';
import {ChannelDataRetentionPolicy, GlobalDataRetentionPolicy, TeamDataRetentionPolicy} from './data_retention';

export type GeneralState = {
    appState: boolean;
    credentials: any;
    config: Partial<Config>;
    dataRetention: {
        policies: {
            channels: ChannelDataRetentionPolicy[];
            global: GlobalDataRetentionPolicy;
            teams: TeamDataRetentionPolicy[];
        };
        lastCleanUpAt: Date;
    };
    deviceToken: string;
    license: any;
    serverVersion: string;
    timezones: Array<string>;
};

export type FormattedMsg = {
    id: string;
    defaultMessage: string;
};
