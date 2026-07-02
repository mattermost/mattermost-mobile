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
        alignSelf: 'center',
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
            description: intl.formatMessage({id: 'onboaring.welcome_description', defaultMessage: 'Mattermost is a sovereign collaboration platform, purpose-built for operational environments. Secure by design.'}),
            image: chatSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.realtime_collaboration', defaultMessage: 'Collaborate in real‑time'}),
            description: intl.formatMessage({id: 'onboarding.realtime_collaboration_description', defaultMessage: 'Coordinate across teams with persistent mission channels, secure file sharing, and automated workflows.'}),
            image: teamCommunicationSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.calls', defaultMessage: 'Start secure calls instantly'}),
            description: intl.formatMessage({id: 'onboarding.calls_description', defaultMessage: 'Seamlessly move from chat to audio calls and screen sharing without switching tools or losing context.'}),
            image: callsSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.integrations', defaultMessage: 'Integrate with your systems'}),
            description: intl.formatMessage({id: 'onboarding.integrations_description', defaultMessage: 'Integrate with the tools and systems powering your operations — ticketing, conferencing, alerting, or custom integrations.'}),
            image: integrationsSvg,
        },
    ];

    return {slidesData};
};

export default useSlidesData;
