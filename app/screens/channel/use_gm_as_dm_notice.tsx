// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {getPreferenceAsBool} from '@helpers/api/preference';
import EphemeralStore from '@store/ephemeral_store';

import type PreferenceModel from '@typings/database/models/servers/preference';

const useGMasDMNotice = (userId: string, channelType: ChannelType, dismissedGMasDMNotice: PreferenceModel[], hasGMasDMFeature: boolean) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    useEffect(() => {
        if (!hasGMasDMFeature) {
            return;
        }

        const preferenceValue = getPreferenceAsBool(dismissedGMasDMNotice, Preferences.CATEGORIES.SYSTEM_NOTICE, Preferences.NOTICES.GM_AS_DM);
        if (preferenceValue) {
            return;
        }

        if (channelType !== 'G') {
            return;
        }

        if (EphemeralStore.noticeShown.has(Preferences.NOTICES.GM_AS_DM)) {
            return;
        }

        const onRemindMeLaterPress = () => {
            EphemeralStore.noticeShown.add(Preferences.NOTICES.GM_AS_DM);
        };

        const onHideAndForget = () => {
            EphemeralStore.noticeShown.add(Preferences.NOTICES.GM_AS_DM);
            savePreference(serverUrl, [{category: Preferences.CATEGORIES.SYSTEM_NOTICE, name: Preferences.NOTICES.GM_AS_DM, value: 'true', user_id: userId}]);
        };

        // Show the GM as DM notice if needed
        Alert.alert(
            intl.formatMessage({id: 'system_notice.title.gm_as_dm', defaultMessage: 'Updates to Group Messages'}),
            intl.formatMessage({id: 'system_noticy.body.gm_as_dm', defaultMessage: 'You will now be notified for all activity in your group messages along with a notification badge for every new message.\n\nYou can configure this in notification preferences for each group message.'}),
            [
                {
                    text: intl.formatMessage({id: 'system_notice.remind_me', defaultMessage: 'Remind Me Later'}),
                    onPress: onRemindMeLaterPress,
                },
                {
                    text: intl.formatMessage({id: 'system_notice.dont_show', defaultMessage: 'Don\'t Show Again'}),
                    onPress: onHideAndForget,
                },
            ],
        );
    }, []);
};

export default useGMasDMNotice;
