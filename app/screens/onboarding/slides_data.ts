// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

export type OnboardingItem = {
    id: string;
    title: string;
    description: string;
    image: string;
}
const useSalidesData = () => {
    const intl = useIntl();

    const slidesData: OnboardingItem[] = [
        {
            id: '1',
            title: intl.formatMessage({id: 'onboarding_screen.welcome', defaultMessage: 'Welcome'}),
            description: intl.formatMessage({id: 'onboaring.welcome_description', defaultMessage: 'Mattermost is an open source platform for developer collaboration. Secure, flexible, and integrated with your tools.'}),
            image: require('./illustrations/chat.svg').default,
        },
        {
            id: '2',
            title: intl.formatMessage({id: 'onboarding.realtime_collaboration', defaultMessage: 'Collaborate in real-time'}),
            description: intl.formatMessage({id: 'onboarding.realtime_collaboration_description', defaultMessage: 'Persistent channels, direct messaging, and file sharing works seamlessly so you can stay connected, wherever you are.'}),
            image: require('./illustrations/team_communication.svg').default,
        },
        {
            id: '3',
            title: intl.formatMessage({id: 'onboarding.calls', defaultMessage: 'Start secure audio calls instantly'}),
            description: intl.formatMessage({id: 'onboarding.calls_description', defaultMessage: 'When typing isn’t fast enough, switch from channel-based chat to secure audio calls with a single tap.'}),
            image: require('./illustrations/calls.svg').default,
        },
        {
            id: '4',
            title: intl.formatMessage({id: 'onboarding.integrations', defaultMessage: 'Integrate with tools you love'}),
            description: intl.formatMessage({id: 'onboarding.integrations_description', defaultMessage: 'Go beyond chat with tightly-integratedproduct solutions matched to common development processes.'}),
            image: require('./illustrations/integrations.svg').default,
        },
    ];

    return {slidesData};
};

export default useSalidesData;
