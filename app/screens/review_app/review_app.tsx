// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {requestReview} from 'expo-store-review';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, BackHandler, Pressable, Text, TouchableOpacity, View} from 'react-native';
import Animated, {runOnJS, SlideInDown, SlideOutDown} from 'react-native-reanimated';

import {storeDontAskForReview, storeLastAskForReview} from '@actions/app/global';
import {isNPSEnabled} from '@actions/remote/nps';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import ReviewAppIllustration from '@components/illustrations/review_app';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import ShareFeedbackStore from '@store/share_feedback_store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ReviewAppProps = {
    hasAskedBefore: boolean;
    onDismiss: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    root: {
        flex: 1,
        backgroundColor: changeOpacity('#000000', 0.50),
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    leftButton: {
        flex: 1,
        marginRight: 5,
    },
    rightButton: {
        flex: 1,
        marginLeft: 5,
    },
    close: {
        justifyContent: 'center',
        height: 44,
        width: 40,
        paddingLeft: 16,
        paddingTop: 16,
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
    dontAsk: {
        ...typography('Body', 75, 'SemiBold'),
        color: theme.buttonBg,
        marginTop: 24,
    },
}));

const ReviewApp = ({
    hasAskedBefore,
    onDismiss,
}: ReviewAppProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [show, setShow] = useState(true);

    const executeAfterDone = useRef<() => void>(onDismiss);

    const close = useCallback((afterDone: () => void) => {
        executeAfterDone.current = afterDone;
        storeLastAskForReview();
        setShow(false);
    }, []);

    const onPressYes = useCallback(async () => {
        close(async () => {
            onDismiss();
            try {
                await requestReview();
            } catch (error) {
                Alert.alert(
                    intl.formatMessage({id: 'rate.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'rate.error.text', defaultMessage: 'There has been an error while opening the review modal.'}),
                );
            }
        });
    }, [close, intl, onDismiss]);

    const onPressNeedsWork = useCallback(async () => {
        close(async () => {
            onDismiss();
            if (await isNPSEnabled(serverUrl)) {
                ShareFeedbackStore.show();
            }
        });
    }, [close, onDismiss, serverUrl]);

    const onPressDontAsk = useCallback(() => {
        storeDontAskForReview();
        close(onDismiss);
    }, [close, onDismiss]);

    const onPressClose = useCallback(() => {
        close(onDismiss);
    }, [close, onDismiss]);

    // Handle Android back button
    useEffect(() => {
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
            onPressClose();
            return true;
        });

        return () => subscription.remove();
    }, [onPressClose]);

    const doAfterAnimation = useCallback(() => {
        executeAfterDone.current();
    }, []);

    const slideOut = useMemo(() => SlideOutDown.withCallback((finished: boolean) => {
        'worklet';
        if (finished) {
            runOnJS(doAfterAnimation)();
        }
    }), [doAfterAnimation]);

    return (
        <Pressable style={styles.root}>
            <View
                style={styles.container}
                testID='review_app.screen'
            >
                {show &&
                    <Animated.View
                        style={styles.wrapper}
                        entering={SlideInDown}
                        exiting={slideOut}
                    >
                        <TouchableOpacity
                            style={styles.close}
                            onPress={onPressClose}
                        >
                            <CompassIcon
                                name='close'
                                size={24}
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                            />
                        </TouchableOpacity>
                        <View style={styles.content}>
                            <ReviewAppIllustration theme={theme}/>
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
                                    buttonContainerStyle={styles.leftButton}
                                />
                                <Button
                                    theme={theme}
                                    size={'lg'}
                                    onPress={onPressYes}
                                    text={intl.formatMessage({id: 'rate.button.yes', defaultMessage: 'Love it!'})}
                                    buttonContainerStyle={styles.rightButton}
                                />
                            </View>
                            {hasAskedBefore && (
                                <Pressable onPress={onPressDontAsk}>
                                    <Text style={styles.dontAsk}>
                                        {intl.formatMessage({id: 'rate.dont_ask_again', defaultMessage: 'Don\'t ask me again'})}
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    </Animated.View>
                }
            </View>
        </Pressable>
    );
};

export default ReviewApp;
