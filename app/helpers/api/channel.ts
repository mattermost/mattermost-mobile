// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import type {IntlShape} from 'react-intl';

export function privateChannelJoinPrompt(displayName: string, intl: IntlShape): Promise<{join: boolean}> {
    return new Promise((resolve) => {
        Alert.alert(
            intl.formatMessage({
                id: 'permalink.show_dialog_warn.title',
                defaultMessage: 'Join private channel',
            }),
            intl.formatMessage({
                id: 'permalink.show_dialog_warn.description',
                defaultMessage: 'You are about to join {channel} without explicitly being added by the Channel Admin. Are you sure you wish to join this private channel?',
            }, {
                channel: displayName,
            }),
            [
                {
                    text: intl.formatMessage({
                        id: 'permalink.show_dialog_warn.cancel',
                        defaultMessage: 'Cancel',
                    }),
                    onPress: async () => {
                        resolve({
                            join: false,
                        });
                    },
                },
                {
                    text: intl.formatMessage({
                        id: 'permalink.show_dialog_warn.join',
                        defaultMessage: 'Join',
                    }),
                    onPress: async () => {
                        resolve({
                            join: true,
                        });
                    },
                },
            ],
        );
    });
}
