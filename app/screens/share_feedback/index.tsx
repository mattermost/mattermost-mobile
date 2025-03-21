// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity} from 'react-native';
import Animated, {runOnJS, SlideInDown, SlideOutDown} from 'react-native-reanimated';

import {goToNPSChannel} from '@actions/remote/channel';
import {giveFeedbackAction} from '@actions/remote/nps';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import ShareFeedbackIllustration from '@components/illustrations/share_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import SecurityManager from '@managers/security_manager';
import {dismissOverlay} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
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
        marginTop: 0,
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
}));

const ShareFeedback = ({
    componentId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const [show, setShow] = useState(true);

    const executeAfterDone = useRef<() => void>(() => dismissOverlay(componentId));

    const close = useCallback((afterDone: () => void) => {
        executeAfterDone.current = afterDone;
        setShow(false);
    }, []);

    const onPressYes = useCallback(async () => {
        close(async () => {
            await dismissOverlay(componentId);
            await goToNPSChannel(serverUrl);
            giveFeedbackAction(serverUrl);
        });
    }, [close, intl, serverUrl]);

    const onPressNo = useCallback(() => {
        close(() => dismissOverlay(componentId));
    }, [close, componentId]);

    useBackNavigation(onPressNo);
    useAndroidHardwareBackHandler(componentId, onPressNo);

    const doAfterAnimation = useCallback(() => {
        executeAfterDone.current();
    }, []);

    const slideOut = useMemo(() => SlideOutDown.withCallback((finished: boolean) => {
        'worklet';
        if (finished) {
            runOnJS(doAfterAnimation)();
        }
    }), []);

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId)}
            style={styles.root}
        >
            <View
                style={styles.container}
                testID='rate_app.screen'
            >
                {show &&
                    <Animated.View
                        style={styles.wrapper}
                        entering={SlideInDown}
                        exiting={slideOut}
                    >
                        <TouchableOpacity
                            style={styles.close}
                            onPress={onPressNo}
                        >
                            <CompassIcon
                                name='close'
                                size={24}
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                            />
                        </TouchableOpacity>
                        <View style={styles.content}>
                            <ShareFeedbackIllustration theme={theme}/>
                            <Text style={styles.title}>
                                {intl.formatMessage({id: 'share_feedback.title', defaultMessage: 'Would you share your feedback?'})}
                            </Text>
                            <Text style={styles.subtitle}>
                                {intl.formatMessage({id: 'share_feedback.subtitle', defaultMessage: 'We\'d love to hear how we can make your experience better.'})}
                            </Text>
                            <View style={styles.buttonsWrapper}>
                                <Button
                                    theme={theme}
                                    size={'lg'}
                                    emphasis={'tertiary'}
                                    onPress={onPressNo}
                                    text={intl.formatMessage({id: 'share_feedback.button.no', defaultMessage: 'No, thanks'})}
                                    buttonContainerStyle={styles.leftButton}
                                />
                                <Button
                                    theme={theme}
                                    size={'lg'}
                                    onPress={onPressYes}
                                    text={intl.formatMessage({id: 'share_feedback.button.yes', defaultMessage: 'Yes'})}
                                    buttonContainerStyle={styles.rightButton}
                                />
                            </View>
                        </View>
                    </Animated.View>
                }
            </View>
        </View>
    );
};

export default ShareFeedback;
