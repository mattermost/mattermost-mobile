// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {TouchableWithoutFeedback, View, Text, Alert, TouchableOpacity} from 'react-native';
import InAppReview from 'react-native-in-app-review';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {storeDontAskForReview, storeLastAskForReview} from '@actions/app/global';
import {isNPSEnabled} from '@actions/remote/general';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import SearchIllustration from '@components/no_results_with_term/search_illustration';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useBackNavigation from '@hooks/navigate_back';
import {dismissOverlay, showShareFeedbackModal} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    hasAskedBefore: boolean;
    componentId: string;
}
const edges: Edge[] = ['left', 'right', 'top'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        maxWidth: 680,
        alignSelf: 'center',
        alignContet: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        flexDirection: 'row',
    },
    wrapper: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 12,
        flex: 1,
        margin: 10,
        opacity: 1,
        borderWidth: 1,
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),

    },
    content: {
        marginHorizontal: 24,
        marginBottom: 24,
        alignItems: 'center',
    },
    buttonsWrapper: {
        flexDirection: 'row',
        width: '100%',
    },
    close: {
        justifyContent: 'center',
        height: 44,
        width: 40,
        paddingLeft: 16,
    },
    title: {
        ...typography('Heading', 600, 'SemiBold'),
        color: theme.centerChannelColor,
        marginTop: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginBottom: 24,
        textAlign: 'center',
    },
    leftButton: {
        flex: 1,
        marginRight: 5,
    },
    rightButton: {
        flex: 1,
        marginLeft: 5,
    },
    dontAsk: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.buttonBg,
        marginTop: 24,
    },
}));

const close = (componentId: string) => {
    dismissOverlay(componentId);
};

const ReviewApp = ({
    hasAskedBefore,
    componentId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const closeModal = useCallback(() => {
        close(componentId);
        storeLastAskForReview();
    }, [componentId]);

    useBackNavigation(closeModal);

    const onPressYes = useCallback(async () => {
        try {
            // eslint-disable-next-line new-cap
            await InAppReview.RequestInAppReview();
        } catch (error) {
            Alert.alert(
                intl.formatMessage({id: 'rate.error.title', defaultMessage: 'Error'}),
                intl.formatMessage({id: 'rate.error.text', defaultMessage: 'There has been an error while opening the review modal.'}),
            );
        }
        closeModal();
    }, [closeModal, intl]);

    const onPressNeedsWork = useCallback(async () => {
        closeModal();

        if (await isNPSEnabled(serverUrl)) {
            showShareFeedbackModal(hasAskedBefore);
        }
    }, [hasAskedBefore, closeModal]);

    const onPressDontAsk = useCallback(() => {
        storeDontAskForReview();
        closeModal();
    }, [closeModal, intl]);

    return (
        <SafeAreaView
            style={styles.container}
            testID='rate_app.screen'
            edges={edges}
        >
            <View style={styles.wrapper}>
                <TouchableOpacity
                    style={styles.close}
                    onPress={closeModal}
                >
                    <CompassIcon
                        name='close'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.56)}
                    />
                </TouchableOpacity>
                <View style={styles.content}>
                    <SearchIllustration/>
                    <Text style={styles.title}>
                        {intl.formatMessage({id: 'rate.title', defaultMessage: 'Enjoying Mattermost?'})}
                    </Text>
                    <Text style={styles.subtitle}>
                        {intl.formatMessage({id: 'rate.subtitle', defaultMessage: 'Let us know what you think.'})}
                    </Text>
                    <View style={styles.buttonsWrapper}>
                        <Button
                            theme={theme}
                            size={'lg'}
                            emphasis={'tertiary'}
                            onPress={onPressNeedsWork}
                            text={intl.formatMessage({id: 'rate.button.needs_work', defaultMessage: 'Needs work'})}
                            backgroundStyle={styles.leftButton}
                        />
                        <Button
                            theme={theme}
                            size={'lg'}
                            onPress={onPressYes}
                            text={intl.formatMessage({id: 'rate.button.yes', defaultMessage: 'Love it!'})}
                            backgroundStyle={styles.rightButton}
                        />
                    </View>
                    {hasAskedBefore && (
                        <TouchableWithoutFeedback
                            onPress={onPressDontAsk}
                        >
                            <Text style={styles.dontAsk}>
                                {intl.formatMessage({id: 'rate.dont_ask_again', defaultMessage: 'Don\'t ask me again'})}
                            </Text>
                        </TouchableWithoutFeedback>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
};

export default ReviewApp;
