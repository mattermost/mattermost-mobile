// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView, Text, View} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import ErrorBoundary from '@components/markdown/error_boundary';
import MathView from '@components/math_view';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import {splitLatexCodeInLines} from '@utils/markdown/latex';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    content: string;
}

const edges: Edge[] = ['left', 'right'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    const codeVerticalPadding = Platform.select({
        ios: 4,
        android: 0,
    });

    return {
        scrollContainer: {
            flex: 1,
        },
        container: {
            minHeight: '100%',
        },
        mathStyle: {
            color: theme.centerChannelColor,
        },
        scrollCode: {
            minHeight: '100%',
            flexDirection: 'column',
            paddingLeft: 10,
            paddingVertical: 10,
        },
        code: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            marginHorizontal: 5,
            paddingVertical: codeVerticalPadding,
        },
        errorText: {
            ...typography('Body', 100),
            marginHorizontal: 5,
            color: theme.errorTextColor,
        },
    };
});

const Latex = ({componentId, content}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const lines = splitLatexCodeInLines(content);

    const onErrorMessage = (errorMsg: Error) => {
        return <Text style={style.errorText}>{'Error: ' + errorMsg.message}</Text>;
    };

    const onRenderErrorMessage = ({error}: {error: Error}) => {
        return <Text style={style.errorText}>{'Render error: ' + error.message}</Text>;
    };

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={style.scrollContainer}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <ScrollView
                style={style.scrollContainer}
                contentContainerStyle={style.container}
            >
                <ScrollView
                    style={style.scrollContainer}
                    contentContainerStyle={style.scrollCode}
                    horizontal={true}
                >
                    <ErrorBoundary
                        error={intl.formatMessage({id: 'markdown.latex.error', defaultMessage: 'Latex render error'})}
                        theme={theme}
                    >
                        <>
                            {lines.map((latexCode) => (
                                <View
                                    style={style.code}
                                    key={latexCode}
                                >
                                    <MathView
                                        math={latexCode}
                                        onError={onErrorMessage}
                                        renderError={onRenderErrorMessage}
                                        resizeMode={'cover'}
                                        style={style.mathStyle}
                                    />
                                </View>
                            ))}
                        </>
                    </ErrorBoundary>
                </ScrollView>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Latex;
