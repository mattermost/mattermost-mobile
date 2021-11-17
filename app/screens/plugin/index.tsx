// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {shallowEqual, useSelector} from 'react-redux';

import StatusBar from '@components/status_bar';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {GlobalState} from '@mm-redux/types/store';
import type {Theme} from '@mm-redux/types/theme';

const HEADERS = {
    'X-Mobile-App': 'mattermost',
};

interface PluginProps {
    link: string;
}

function Plugin({link}: PluginProps) {
    const [theme] = useSelector((state: GlobalState) => ([
        getTheme(state),
    ]), shallowEqual);

    const style = getStyleSheet(theme);

    const renderWebView = () => {
        const userAgent = 'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/LMY48X) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/608.2.11';
        return (
            <WebView
                automaticallyAdjustContentInsets={false}
                cacheEnabled={false}
                javaScriptEnabled={true}
                injectedJavaScript={'const meta = document.createElement(\'meta\'); meta.setAttribute(\'content\', \'width=device-width, initial-scale=1\'); meta.setAttribute(\'name\', \'viewport\'); document.getElementsByTagName(\'head\')[0].appendChild(meta); '}
                onShouldStartLoadWithRequest={() => true}
                source={{uri: link, headers: HEADERS}}
                startInLoadingState={true}
                userAgent={userAgent}
                useSharedProcessPool={false}
            />
        );
    };

    return (
        <SafeAreaView
            style={style.container}
            testID='plugin.webview'
        >
            <StatusBar/>
            {renderWebView()}
        </SafeAreaView>
    );
}

export default Plugin;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            marginTop: 40,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 23,
            paddingHorizontal: 30,
        },
    };
});

