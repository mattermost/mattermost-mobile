// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack} from 'expo-router';
import React, {useMemo} from 'react';

import {useTheme} from '@context/theme';
import {getHomeTabHeaderOptions} from '@hooks/navigation_header';

type Props = {
    title: string;
};

export default function HomeTabStackLayout({title}: Props) {
    const theme = useTheme();
    const screenOptions = useMemo(() => ({
        ...getHomeTabHeaderOptions(theme),
        title,
    }), [theme, title]);

    return <Stack screenOptions={screenOptions}/>;
}
