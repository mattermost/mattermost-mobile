// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import {useTheme} from '@context/theme';

import CallsSvg from './illustrations/calls';
import DaakiaLogoSvg from './illustrations/daakia_logo';
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
    const daakiaLogoSvg = (
        <DaakiaLogoSvg
            styles={styles.image}
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
            title: intl.formatMessage({id: 'onboarding.welcome', defaultMessage: 'Welcome to Daakia Chat'}),
            description: intl.formatMessage({id: 'onboaring.welcome_description', defaultMessage: 'Experience seamless team communication with enterprise-grade security and powerful collaboration tools designed for modern teams.'}),
            image: daakiaLogoSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.realtime_collaboration', defaultMessage: 'Connect & Collaborate Instantly'}),
            description: intl.formatMessage({id: 'onboarding.realtime_collaboration_description', defaultMessage: 'Stay productive with real-time messaging, file sharing, and organized channels that keep your team aligned and focused.'}),
            image: teamCommunicationSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.calls', defaultMessage: 'Crystal Clear Voice Calls'}),
            description: intl.formatMessage({id: 'onboarding.calls_description', defaultMessage: 'When typing isn’t fast enough, switch from channel-based chat to secure audio calls with a single tap.'}),
            image: callsSvg,
        },
        {
            title: intl.formatMessage({id: 'onboarding.integrations', defaultMessage: 'Powerful Integrations'}),
            description: intl.formatMessage({id: 'onboarding.integrations_description', defaultMessage: 'Connect your favorite tools and streamline workflows with smart integrations that boost productivity and reduce context switching.'}),
            image: integrationsSvg,
        },
    ];

    return {slidesData};
};

export default useSlidesData;
