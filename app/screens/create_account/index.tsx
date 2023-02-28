// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    Platform,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {sendCreateAccountRequest} from '@actions/remote/session';
import CompassIcon from '@app/components/compass_icon';
import Loading from '@app/components/loading';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import Background from '@screens/background';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {popTopScreen} from '../navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    serverUrl: string;
    theme: Theme;
};

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    centered: {
        width: '100%',
        maxWidth: 600,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        marginTop: Platform.select({android: 56}),
    },
    error: {
        marginTop: 64,
    },
    flex: {
        flex: 1,
    },
    form: {
        marginTop: 20,
    },
    header: {
        color: theme.mentionColor,
        marginBottom: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    innerContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    returnButton: {
        marginTop: 32,
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
    },
    successContainer: {
        alignItems: 'center',
        paddingHorizontal: 24,
        justifyContent: 'center',
        flex: 1,
    },
    successText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'SemiBold'),
        textAlign: 'center',
    },
    successTitle: {
        color: theme.mentionColor,
        marginBottom: 12,
        ...typography('Heading', 1000),
    },
    inputBoxPassword: {
        marginTop: 24,
        marginBottom: 11,
        color: theme.centerChannelColor,
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
    endAdornment: {
        top: 2,
    },
}));

const hitSlop = {top: 8, right: 8, bottom: 8, left: 8};

const CreateAccount = ({componentId, serverUrl, theme}: Props) => {
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(dimensions.width);
    const isTablet = useIsTablet();

    const refPassword = useRef<TextInput>(null);
    const refTeamCode = useRef<TextInput>(null);

    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [teamCode, setTeamCode] = useState<string>('');
    const [errorEmail, setErrorEmail] = useState<string>('');
    const [errorPassword, setErrorPassword] = useState<string>('');
    const [errorTeamCode, setErrorTeamCode] = useState<string>('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const styles = getStyleSheet(theme);

    const changeEmail = useCallback((emailAddress: string) => {
        setEmail(emailAddress);
        setErrorEmail('');
    }, []);

    const changePassword = useCallback((passwordStr: string) => {
        setPassword(passwordStr);
        setErrorPassword('');
    }, []);

    const changeTeamCode = useCallback((teamCodeStr: string) => {
        setTeamCode(teamCodeStr);
        setErrorTeamCode('');
    }, []);

    const onFocus = useCallback(() => {
        if (Platform.OS === 'ios') {
            let offsetY = 150;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = isLandscape ? 230 : 150;
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    }, [dimensions]);

    const onReturn = useCallback(() => {
        Navigation.popTo(Screens.LOGIN);
    }, []);

    const submitCreateAccount = useCallback(async () => {
        Keyboard.dismiss();

        if (!email) {
            setErrorEmail(
                formatMessage({
                    id: 'mobile.account.require_username',
                    defaultMessage: 'Please input an email',
                }),
            );
            return;
        }

        setErrorEmail('');

        if (!password) {
            setErrorPassword(
                formatMessage({
                    id: 'mobile.account.require_password',
                    defaultMessage: 'Please enter password',
                }),
            );
            return;
        }

        setErrorPassword('');

        await setIsLoading(true);
        const result = await sendCreateAccountRequest(
            serverUrl,
            email + '@gmail.com',
            email,
            password,
            teamCode,
        );
        await setIsLoading(false);

        console.log(result, 'result');

        if (
            result.error &&
            result.error.toString().toLowerCase().includes('username')
        ) {
            setErrorEmail(
                formatMessage({
                    id: 'mobile.account.username_already_exists',
                    defaultMessage: result.error.toString(),
                }),
            );
            return;
        }

        setErrorEmail('');

        if (
            result.error &&
            result.error.toString().toLowerCase().includes('password')
        ) {
            setErrorPassword(
                formatMessage({
                    id: 'mobile.account.invalid_password',
                    defaultMessage: result.error.toString(),
                }),
            );
            return;
        }

        setErrorPassword('');

        if (
            result.error &&
            result.error.toString().toLowerCase().includes('team')
        ) {
            setErrorTeamCode(
                formatMessage({
                    id: 'mobile.account.team_code_not_found',
                    defaultMessage: result.error.toString(),
                }),
            );
            return;
        }

        setErrorTeamCode('');

        popTopScreen();
    }, [email, password, teamCode]);

    const onFocusPassword = useCallback(() => {
        refPassword?.current?.focus();
    }, []);

    const onFocusTeamCode = useCallback(() => {
        refTeamCode?.current?.focus();
    }, []);

    const renderProceedButton = useMemo(() => {
        const buttonDisabled = !email || !password;
        const buttonType = buttonDisabled ? 'disabled' : 'default';
        const styleButtonText = buttonTextStyle(
            theme,
            'lg',
            'primary',
            buttonType,
        );
        const styleButtonBackground = buttonBackgroundStyle(
            theme,
            'lg',
            'primary',
            buttonType,
        );

        let buttonID = t('mobile.account.create_account_button');
        let buttonText = 'Create';
        let buttonIcon;

        if (isLoading) {
            buttonID = t('mobile.add_team.create_team_button_loading');
            buttonText = 'Creating';
            buttonIcon = (
                <Loading
                    containerStyle={styles.loadingContainerStyle}
                    color={theme.buttonColor}
                />
            );
        }

        return (
            <Button
                disabled={buttonDisabled || isLoading}
                onPress={submitCreateAccount}
                containerStyle={[
                    styleButtonBackground,
                    {marginTop: errorTeamCode ? 30 : 20},
                ]}
            >
                {buttonIcon}
                <FormattedText
                    id={buttonID}
                    defaultMessage={buttonText}
                    style={styleButtonText}
                />
            </Button>
        );
    }, [
        email,
        password,
        teamCode,
        errorEmail,
        errorPassword,
        errorTeamCode,
        isLoading,
        theme,
    ]);

    const togglePasswordVisiblity = useCallback(() => {
        setIsPasswordVisible((prevState) => !prevState);
    }, []);

    const endAdornment = (
        <TouchableOpacity
            onPress={togglePasswordVisiblity}
            hitSlop={hitSlop}
            style={styles.endAdornment}
        >
            <CompassIcon
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={changeOpacity(theme.centerChannelColor, 0.64)}
            />
        </TouchableOpacity>
    );

    const getCenterContent = () => {
        return (
            <KeyboardAwareScrollView
                bounces={false}
                contentContainerStyle={styles.innerContainer}
                enableAutomaticScroll={Platform.OS === 'android'}
                enableOnAndroid={false}
                enableResetScrollToCoords={true}
                extraScrollHeight={0}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                ref={keyboardAwareRef}
                scrollToOverflowEnabled={true}
                style={styles.flex}
            >
                <View style={styles.centered}>
                    <FormattedText
                        defaultMessage='Create Account'
                        id='mobile.account.create_account'
                        style={styles.header}
                    />
                    <View style={styles.form}>
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            enablesReturnKeyAutomatically={true}
                            error={errorEmail}
                            keyboardType='email-address'
                            label={formatMessage({
                                id: 'login.username',
                                defaultMessage: 'Username',
                            })}
                            onChangeText={changeEmail}
                            onFocus={onFocus}
                            onSubmitEditing={onFocusPassword}
                            returnKeyType='next'
                            spellCheck={false}
                            theme={theme}
                            value={email}
                        />
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            containerStyle={[
                                styles.inputBoxPassword,
                                {marginTop: errorEmail ? 40 : 25},
                            ]}
                            enablesReturnKeyAutomatically={true}
                            error={errorPassword}
                            keyboardType='default'
                            secureTextEntry={!isPasswordVisible}
                            label={formatMessage({
                                id: 'login.password',
                                defaultMessage: 'Password',
                            })}
                            onChangeText={changePassword}
                            onFocus={onFocus}
                            onSubmitEditing={onFocusTeamCode}
                            returnKeyType='next'
                            spellCheck={false}
                            theme={theme}
                            value={password}
                            ref={refPassword}
                            endAdornment={endAdornment}
                        />
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            containerStyle={[
                                styles.inputBoxPassword,
                                {marginTop: errorPassword ? 40 : 10},
                            ]}
                            enablesReturnKeyAutomatically={true}
                            error={errorTeamCode}
                            keyboardType='email-address'
                            label={formatMessage({
                                id: 'mobile.account.team_code',
                                defaultMessage: 'Team Code',
                            })}
                            onChangeText={changeTeamCode}
                            onFocus={onFocus}
                            onSubmitEditing={submitCreateAccount}
                            returnKeyType='done'
                            spellCheck={false}
                            maxLength={10}
                            theme={theme}
                            value={teamCode}
                            ref={refTeamCode}
                        />
                        {renderProceedButton}
                    </View>
                </View>
            </KeyboardAwareScrollView>
        );
    };

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = -dimensions.width;
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(
            listener,
            componentId,
        );

        return () => unsubscribe.remove();
    }, [dimensions]);

    useEffect(() => {
        translateX.value = 0;
        setEmail('');
        setPassword('');
        setTeamCode('');
        setErrorEmail('');
        setErrorPassword('');
        setErrorTeamCode('');
    }, []);

    useAndroidHardwareBackHandler(componentId, onReturn);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea style={[styles.container, transform]}>
                {getCenterContent()}
            </AnimatedSafeArea>
        </View>
    );
};

export default CreateAccount;
