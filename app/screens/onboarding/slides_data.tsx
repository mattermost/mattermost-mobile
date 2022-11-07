// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import CallsSvg from './illustrations/calls_svg';
import ChatSvg from './illustrations/chat_svg';
import IntegrationsSvg from './illustrations/integrations_svg';
import TeamCommunicationSvg from './illustrations/team_communication_svg';

export type OnboardingItem = {
    id: string;
    title: string;
    description: string;
    image: React.ReactElement;
}

const styles = StyleSheet.create({
    image: {
        justifyContent: 'center',
        height: 60,
        maxHeight: 180,
        width: 60,
    },
});

const useSalidesData = () => {
    const intl = useIntl();
    const callsSvg = (<CallsSvg styles={styles.image}/>);
    const chatSvg = (<ChatSvg styles={styles.image}/>);
    const teamCommunicationSvg = (<TeamCommunicationSvg styles={styles.image}/>);
    const integrationsSvg = (<IntegrationsSvg styles={styles.image}/>);

    const slidesData: OnboardingItem[] = [
        {
            id: '1',
            title: intl.formatMessage({id: 'onboarding_screen.welcome', defaultMessage: 'Welcome'}),
            description: intl.formatMessage({id: 'onboaring.welcome_description', defaultMessage: 'Mattermost is an open source platform for developer collaboration. Secure, flexible, and integrated with your tools.'}),
            image: chatSvg,
        },
        {
            id: '2',
            title: intl.formatMessage({id: 'onboarding.realtime_collaboration', defaultMessage: 'Collaborate in real-time'}),
            description: intl.formatMessage({id: 'onboarding.realtime_collaboration_description', defaultMessage: 'Persistent channels, direct messaging, and file sharing works seamlessly so you can stay connected, wherever you are.'}),
            image: teamCommunicationSvg,
        },
        {
            id: '3',
            title: intl.formatMessage({id: 'onboarding.calls', defaultMessage: 'Start secure audio calls instantly'}),
            description: intl.formatMessage({id: 'onboarding.calls_description', defaultMessage: 'When typing isn’t fast enough, switch from channel-based chat to secure audio calls with a single tap.'}),
            image: callsSvg,
        },
        {
            id: '4',
            title: intl.formatMessage({id: 'onboarding.integrations', defaultMessage: 'Integrate with tools you love'}),
            description: intl.formatMessage({id: 'onboarding.integrations_description', defaultMessage: 'Go beyond chat with tightly-integratedproduct solutions matched to common development processes.'}),
            image: integrationsSvg,
        },
    ];

    return {slidesData};
};

export default useSalidesData;
