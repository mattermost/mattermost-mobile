// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {LayoutAnimation} from 'react-native';

import {updateChannelNotifyProps} from '@actions/remote/channel';
import SettingsContainer from '@components/settings/container';
import {NotificationLevel} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useDidUpdate from '@hooks/did_update';
import useBackNavigation from '@hooks/navigate_back';
import {isTypeDMorGM} from '@utils/channel';

import {popTopScreen} from '../navigation';

import MutedBanner from './muted_banner';
import NotifyAbout from './notify_about';
import ResetToDefault from './reset';
import ThreadReplies from './thread_replies';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    channelId: string;
    componentId: AvailableScreens;
    defaultLevel: NotificationLevel;
    defaultThreadReplies: 'all' | 'mention';
    isCRTEnabled: boolean;
    isMuted: boolean;
    notifyLevel: NotificationLevel;
    notifyThreadReplies?: 'all' | 'mention';
    channelType: ChannelType;
    hasGMasDMFeature: boolean;
}

const ChannelNotificationPreferences = ({
    channelId,
    componentId,
    defaultLevel,
    defaultThreadReplies,
    isCRTEnabled,
    isMuted,
    notifyLevel,
    notifyThreadReplies,
    channelType,
    hasGMasDMFeature,
}: Props) => {
    const serverUrl = useServerUrl();
    const defaultNotificationReplies = defaultThreadReplies === 'all';
    const diffNotificationLevel = notifyLevel !== NotificationLevel.DEFAULT && notifyLevel !== defaultLevel;
    const [notifyAbout, setNotifyAbout] = useState<NotificationLevel>(notifyLevel === NotificationLevel.DEFAULT ? defaultLevel : notifyLevel);
    const [threadReplies, setThreadReplies] = useState<boolean>((notifyThreadReplies || defaultThreadReplies) === 'all');
    const [resetDefaultVisible, setResetDefaultVisible] = useState(diffNotificationLevel || defaultNotificationReplies !== threadReplies);

    useDidUpdate(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [isMuted]);

    const onResetPressed = useCallback(() => {
        setResetDefaultVisible(false);
        setNotifyAbout(defaultLevel);
        setThreadReplies(defaultNotificationReplies);
    }, [defaultLevel, defaultNotificationReplies]);

    const onNotificationLevel = useCallback((level: NotificationLevel) => {
        setNotifyAbout(level);
        setResetDefaultVisible(level !== defaultLevel || defaultNotificationReplies !== threadReplies);
    }, [defaultLevel, defaultNotificationReplies, threadReplies]);

    const onSetThreadReplies = useCallback((value: boolean) => {
        setThreadReplies(value);
        setResetDefaultVisible(defaultNotificationReplies !== value || notifyAbout !== defaultLevel);
    }, [defaultLevel, defaultNotificationReplies, notifyAbout]);

    const save = useCallback(() => {
        const pushThreads = threadReplies ? 'all' : 'mention';

        let notifyAboutToUse = notifyAbout;
        if (notifyAbout === defaultLevel) {
            notifyAboutToUse = NotificationLevel.DEFAULT;
        }

        if (notifyLevel !== notifyAboutToUse || (isCRTEnabled && pushThreads !== notifyThreadReplies)) {
            const props: Partial<ChannelNotifyProps> = {push: notifyAboutToUse};
            if (isCRTEnabled) {
                props.push_threads = pushThreads;
            }

            updateChannelNotifyProps(serverUrl, channelId, props);
        }
        popTopScreen(componentId);
    }, [defaultLevel, channelId, componentId, isCRTEnabled, notifyAbout, notifyLevel, notifyThreadReplies, serverUrl, threadReplies]);

    useBackNavigation(save);
    useAndroidHardwareBackHandler(componentId, save);

    const showThreadReplies = isCRTEnabled && (
        !hasGMasDMFeature ||
        !isTypeDMorGM(channelType)
    );
    return (
        <SettingsContainer testID='push_notification_settings'>
            {isMuted && <MutedBanner channelId={channelId}/>}
            <NotifyAbout
                defaultLevel={defaultLevel}
                isMuted={isMuted}
                notifyLevel={notifyAbout}
                onPress={onNotificationLevel}
                rightHeaderComponent={resetDefaultVisible && <ResetToDefault onPress={onResetPressed}/>}
            />
            {showThreadReplies &&
            <ThreadReplies
                isSelected={threadReplies}
                onPress={onSetThreadReplies}
                notifyLevel={notifyAbout}
            />
            }
        </SettingsContainer>
    );
};

export default ChannelNotificationPreferences;
