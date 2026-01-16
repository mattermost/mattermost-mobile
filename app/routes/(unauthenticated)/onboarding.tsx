// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useThemeByAppearanceWithDefault} from '@context/theme';
import {usePropsFromParams} from '@hooks/props_from_params';
import OnboardingComponent from '@screens/onboarding';

import type {LaunchProps} from '@typings/launch';

export default function OnboardingScreen() {
    const {theme: themeProp, ...props} = usePropsFromParams<LaunchProps & {theme: Theme}>();
    const theme = useThemeByAppearanceWithDefault(themeProp);

    // Convert URL params to props format that existing screen expects
    const screenProps = {
        theme,
        ...props,
    };

    return <OnboardingComponent {...screenProps}/>;
}
