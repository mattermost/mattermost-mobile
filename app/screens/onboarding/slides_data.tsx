// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import {useTheme} from '@context/theme';

import CallsSvg from './illustrations/calls';
import ChatSvg from './illustrations/chat';
import IntegrationsSvg from './illustrations/integrations';
import TeamCommunicationSvg from './illustrations/team_communication';

import type {OnboardingItem} from '@typings/screens/onboarding';

const styles = StyleSheet.create({
    image: {
        justifyContent: 'center',
        height: 200,
    },
    lastSlideImage: {
        height: 250,
        left: 8,
    },
});

const useSlidesData = () => {
    const intl = useIntl();
    const theme = useTheme();
    const callsSvg = (
        <CallsSvg
            styles={styles.image}
            theme={theme}
        />
    );
    const chatSvg = (
        <ChatSvg
            styles={styles.image}
            theme={theme}
        />
    );
    const teamCommunicationSvg = (
        <TeamCommunicationSvg
            styles={styles.image}
            theme={theme}
        />
    );
    const integrationsSvg = (
        <IntegrationsSvg
            styles={[styles.image, styles.lastSlideImage]}
            theme={theme}
        />
    );

    const slidesData: OnboardingItem[] = [
        {
            title: intl.formatMessage({id: 'onboarding.welcome', defaultMessage: 'Welcome'}),
            description: intl.formatMessage({id: 'onboaring.welcome_description', defaultMessage: 'Mattermost is an open source platform for developer collaboration. Secure, flexible, and integrated with your tools.'}),
            image: chatSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.realtime_collaboration', defaultMessage: 'Collaborate in real‑time'}),
            description: intl.formatMessage({id: 'onboarding.realtime_collaboration_description', defaultMessage: 'Persistent channels, direct messaging, and file sharing works seamlessly so you can stay connected, wherever you are.'}),
            image: teamCommunicationSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.calls', defaultMessage: 'Start secure audio calls instantly'}),
            description: intl.formatMessage({id: 'onboarding.calls_description', defaultMessage: 'When typing isn’t fast enough, switch from channel-based chat to secure audio calls with a single tap.'}),
            image: callsSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.integrations', defaultMessage: 'Integrate with tools you love'}),
            description: intl.formatMessage({id: 'onboarding.integrations_description', defaultMessage: 'Go beyond chat with tightly-integrated product solutions matched to common development processes.'}),
            image: integrationsSvg,
        },
    ];

    return {slidesData};
};

export default useSlidesData;
