import React from 'react';
import { Linking, Text, View } from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import urlParse from 'url-parse';

import Loading from 'app/components/loading';
import { changeOpacity, makeStyleSheetFromTheme } from 'app/utils/theme';

import { setDeepLinkURL } from '@actions/views/root';
import { Theme } from '@mm-redux/types/preferences';
import Store from '@store/store';

interface SSOWithRedirectURLProps {
    error?: string | null;
    loginUrl: string;
    onCSRFToken: (token: string) => void;
    onMMToken: (token: string) => void;
    theme: Theme
}

function SSOWithRedirectURL({loginUrl, onCSRFToken, onMMToken, theme}: SSOWithRedirectURLProps) {
    const [error, setError] = React.useState<string>('');
    const style = React.useMemo(() => getStyleSheet(theme), [theme]);

    // @TODO: REPLACE IT
    const redirectUrl = `mattermost://callback`;

    const init = () => {
        const parsedUrl = urlParse(loginUrl, true);
        parsedUrl.set('query', {
            ...parsedUrl.query,
            redirect_to: redirectUrl
        });
        const url = parsedUrl.toString();
        Linking.canOpenURL(url).then(() => {
            Linking.openURL(url);
        }).catch((error) => {
            // @TODO: SHOW ERROR
        });
    };

    const onURLChange = ({ url }: { url: string }) => {
        if (url && url.startsWith(redirectUrl)) {
            Store?.redux?.dispatch(setDeepLinkURL(''));
            const parsedUrl = urlParse(url, true);
            if(parsedUrl.query && parsedUrl.query.MMCSRF && parsedUrl.query.MMAUTHTOKEN) {
                onCSRFToken(parsedUrl.query.MMCSRF);
                onMMToken(parsedUrl.query.MMAUTHTOKEN);
            } else {
                // @TODO: SHOW ERROR
            }
        }
    };

    React.useEffect(() => {
        Linking.addEventListener('url', onURLChange);
        init();
        return () => {
            Linking.removeEventListener('url', onURLChange);
        };
    }, []);

    return (
        <SafeAreaView style={style.container}>
            {error ? (
                <View style={style.errorContainer}>
                    <Text style={style.errorText}>...</Text>
                </View>
            ) : (
                <View style={style.infoContainer}>
                    <Loading />
                    <Text></Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const getStyleSheet = makeStyleSheetFromTheme((theme: any) => {
    return {
        container: {
            flex: 1
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
        infoContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center'
        }
    };
})

export default React.memo(SSOWithRedirectURL);
