// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Alert,
    ScrollView,
    Text,
    View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {logout} from '@actions/remote/session';
import {fetchTermsOfService, updateTermsOfServiceStatus} from '@actions/remote/terms_of_service';
import Button from '@components/button';
import Loading from '@components/loading';
import Markdown from '@components/markdown';
import {Screens} from '@constants/index';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {dismissOverlay} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    siteName?: string;
    showToS: boolean;
    componentId: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        root: {
            flex: 1,
            backgroundColor: changeOpacity('#000000', 0.50),
            justifyContent: 'center',
            alginIntems: 'center',
        },
        baseText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'Regular'),
        },
        container: {
            flex: 1,
            maxWidth: 680,
            alignSelf: 'center',
            alignContent: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
        },
        wrapper: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 12,
            margin: 10,
            opacity: 1,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            padding: 24,
        },
        scrollView: {
            marginBottom: 24,
        },
        title: {
            color: theme.centerChannelColor,
            ...typography('Heading', 600, 'SemiBold'),
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            marginBottom: 12,
        },
        errorTitle: {
            color: theme.centerChannelColor,
            ...typography('Heading', 400, 'SemiBold'),
        },
        errorDescription: {
            marginBottom: 24,
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'Regular'),
        },
        loadingContainer: {
            justifyContent: 'center',
        },
        buttonContainer: {
            flexDirection: 'column',
            gap: 10,
        },
    };
});

const TermsOfService = ({
    siteName = 'Mattermost',
    showToS,
    componentId,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [getTermsError, setGetTermError] = useState(false);
    const [termsId, setTermsId] = useState('');
    const [termsText, setTermsText] = useState('');

    const getTerms = useCallback(async () => {
        setLoading(true);
        setGetTermError(false);

        const {terms} = await fetchTermsOfService(serverUrl);
        if (terms) {
            setLoading(false);
            setTermsId(terms.id);
            setTermsText(terms.text);
        } else {
            setLoading(false);
            setGetTermError(true);
        }
    }, [serverUrl]);

    const closeTermsAndLogout = useCallback(() => {
        dismissOverlay(componentId);
        logout(serverUrl, intl, {logoutOnAlert: true});
    }, [serverUrl, componentId, intl]);

    const alertError = useCallback((retry: () => void) => {
        Alert.alert(
            siteName,
            intl.formatMessage({
                id: 'terms_of_service.api_error',
                defaultMessage: 'Unable to complete the request. If this issue persists, contact your System Administrator.',
            }),
            [{
                text: intl.formatMessage({id: 'terms_of_service.alert_cancel', defaultMessage: 'Cancel'}),
                style: 'cancel',
                onPress: closeTermsAndLogout,
            }, {
                text: intl.formatMessage({id: 'terms_of_service.alert_retry', defaultMessage: 'Try Again'}),
                onPress: retry,
            }],
        );
    }, [siteName, intl, closeTermsAndLogout]);

    const alertDecline = useCallback(() => {
        Alert.alert(
            intl.formatMessage({
                id: 'terms_of_service.terms_declined.title',
                defaultMessage: 'You must accept the terms of service',
            }),
            intl.formatMessage({
                id: 'terms_of_service.terms_declined.text',
                defaultMessage: 'You must accept the terms of service to access this server. Please contact your system administrator for more details. You will now be logged out. Log in again to accept the terms of service.',
            }),
            [{
                text: intl.formatMessage({id: 'terms_of_service.terms_declined.ok', defaultMessage: 'OK'}),
                onPress: closeTermsAndLogout,
            }],
        );
    }, [intl, closeTermsAndLogout]);

    const acceptTerms = useCallback(async () => {
        setLoading(true);
        const {error} = await updateTermsOfServiceStatus(serverUrl, termsId, true);
        if (error) {
            alertError(acceptTerms);
        }
    }, [alertError, termsId, serverUrl]);

    const declineTerms = useCallback(async () => {
        setLoading(true);
        const {error} = await updateTermsOfServiceStatus(serverUrl, termsId, false);
        if (error) {
            alertError(declineTerms);
        } else {
            alertDecline();
        }
    }, [serverUrl, termsId, alertError, alertDecline]);

    const onPressClose = useCallback(async () => {
        if (getTermsError) {
            closeTermsAndLogout();
        } else {
            declineTerms();
        }
    }, [declineTerms, closeTermsAndLogout, getTermsError]);

    useEffect(() => {
        getTerms();
    }, []);

    useEffect(() => {
        return () => {
            NavigationStore.setToSOpen(false);
        };
    }, []);

    useEffect(() => {
        if (!showToS) {
            dismissOverlay(componentId);
        }
    }, [showToS, componentId]);

    useAndroidHardwareBackHandler(componentId, onPressClose);

    const blockStyles = useMemo(() => getMarkdownBlockStyles(theme), [theme]);
    const textStyles = useMemo(() => getMarkdownTextStyles(theme), [theme]);

    let content;
    if (loading) {
        content = (
            <View style={styles.loadingContainer}>
                <Loading color={theme.centerChannelColor}/>
            </View>
        );
    } else if (getTermsError) {
        content = (
            <>
                <Text style={styles.errorTitle}>
                    {intl.formatMessage({id: 'terms_of_service.error.title', defaultMessage: 'Failed to get the ToS.'})}
                </Text>
                <Text style={styles.errorDescription}>
                    {intl.formatMessage({id: 'terms_of_service.error.description', defaultMessage: 'It was not possible to get the Terms of Service from the Server.'})}
                </Text>
                <View style={styles.buttonContainer}>
                    <Button
                        onPress={getTerms}
                        theme={theme}
                        text={intl.formatMessage({id: 'terms_of_service.error.retry', defaultMessage: 'Retry'})}
                        size={'lg'}
                    />
                    <Button
                        onPress={onPressClose}
                        theme={theme}
                        text={intl.formatMessage({id: 'terms_of_service.error.logout', defaultMessage: 'Logout'})}
                        size={'lg'}
                        emphasis={'link'}
                    />
                </View>
            </>
        );
    } else {
        content = (
            <>
                <ScrollView
                    style={styles.scrollView}
                >
                    <Markdown
                        baseTextStyle={styles.baseText}
                        textStyles={textStyles}
                        blockStyles={blockStyles}
                        value={termsText}
                        disableHashtags={true}
                        disableAtMentions={true}
                        disableChannelLink={true}
                        disableGallery={true}
                        location={Screens.TERMS_OF_SERVICE}
                        theme={theme}
                    />
                </ScrollView>
                <Button
                    onPress={acceptTerms}
                    theme={theme}
                    text={intl.formatMessage({id: 'terms_of_service.acceptButton', defaultMessage: 'Accept'})}
                    size={'lg'}
                />

                <Button
                    onPress={onPressClose}
                    theme={theme}
                    text={intl.formatMessage({id: 'terms_of_service.decline', defaultMessage: 'Decline'})}
                    size={'lg'}
                    emphasis={'link'}
                />

            </>
        );
    }

    const containerStyle = useMemo(() => {
        return [{
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
        }, styles.container];
    }, [styles, insets]);

    return (
        <View
            style={styles.root}
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <View style={containerStyle}>
                <View style={styles.wrapper}>
                    <Text style={styles.title}>{intl.formatMessage({id: 'terms_of_service.title', defaultMessage: 'Terms of Service'})}</Text>
                    {content}
                </View>
            </View>
        </View>
    );
};

export default TermsOfService;
