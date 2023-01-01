// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {BehaviorSubject} from 'rxjs';

const loadingTeamChannels: {[serverUrl: string]: BehaviorSubject<number>} = {};

export const getLoadingTeamChannelsSubject = (serverUrl: string) => {
    if (!loadingTeamChannels[serverUrl]) {
        loadingTeamChannels[serverUrl] = new BehaviorSubject(0);
    }
    return loadingTeamChannels[serverUrl];
};

export const setTeamLoading = (serverUrl: string, loading: boolean) => {
    const subject = getLoadingTeamChannelsSubject(serverUrl);
    subject.next(subject.value + (loading ? 1 : -1));
};
