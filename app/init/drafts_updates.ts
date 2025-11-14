// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {NativeEventEmitter, NativeModules, type EmitterSubscription} from 'react-native';

import {addFilesToDraft, updateDraftMessage} from '@actions/local/draft';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

const {MattermostShare} = NativeModules;

class DraftsUpdatesSingleton {
    private emitter: NativeEventEmitter;
    private subscription?: EmitterSubscription;

    constructor() {
        this.emitter = new NativeEventEmitter(MattermostShare);
    }

    init() {
        this.subscription?.remove();
        this.subscription = this.emitter.addListener('onDraftUpdated', async (draft) => {
            try {
                const serverUrl = await DatabaseManager.getActiveServerUrl();
                if (serverUrl) {
                    await updateDraftMessage(serverUrl, draft.channelId, '', draft.message);

                    if (draft.files?.length > 0) {
                        addFilesToDraft(serverUrl, draft.channelId, '', draft.files);
                    }
                }
            } catch (error) {
                logDebug('error on draftsUpdates', getFullErrorMessage(error));
            }
        });
    }
}

const DraftUpdates = new DraftsUpdatesSingleton();
export default DraftUpdates;
