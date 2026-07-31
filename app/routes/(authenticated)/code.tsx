// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useCallback, useEffect} from 'react';

import Header from '@components/navigation_header/header';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {usePropsFromParams} from '@hooks/props_from_params';
import CodeScreen, {type CodeScreenProps} from '@screens/code';

import type {NativeStackHeaderProps} from '@react-navigation/native-stack';

export default function CodeRoute() {
    const navigation = useNavigation();
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const {code, title, ...props} = usePropsFromParams<CodeScreenProps & {title: string}>();

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerShown: true,
            presentation: 'card',
            header: ({options}: NativeStackHeaderProps) => (
                <Header
                    defaultHeight={defaultHeight}
                    hasSearch={false}
                    isLargeTitle={false}
                    heightOffset={0}
                    onBackPress={handleBack}
                    rightComponent={options.headerRight?.({canGoBack: true})}
                    theme={theme}
                    title={title}
                />
            ),
        });
    }, [navigation, defaultHeight, handleBack, theme, title]);

    return (
        <CodeScreen
            {...props}
            code={code}
        />
    );
}
