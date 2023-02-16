// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    SafeAreaView,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {createTeam} from '@actions/remote/team';
import FloatingTextInput from '@app/components/floating_text_input_label';
import {useKeyboardHeight} from '@app/hooks/device';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {Channel} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {dismissModal} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {
    changeOpacity,
    getKeyboardAppearanceFromTheme,
    makeStyleSheetFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    joinedIds: Set<string>;
    componentId: AvailableScreens;
    closeButtonId: string;
};

const FIELD_MARGIN_BOTTOM = 24;
const LIST_PADDING = 32;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        flex: 1,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        color: theme.centerChannelColor,
        marginTop: 16,
        ...typography('Heading', 400, 'Regular'),
    },
    description: {
        color: theme.centerChannelColor,
        marginTop: 8,
        maxWidth: 334,
        ...typography('Body', 200, 'Regular'),
    },
    fieldContainer: {
        marginTop: FIELD_MARGIN_BOTTOM,
    },
    helpText: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.5),
        marginTop: 8,
    },
    scrollView: {
        paddingVertical: LIST_PADDING,
        paddingHorizontal: 20,
    },
    loginButton: {
        marginTop: 25,
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
}));

export default function CreateATeam({
    joinedIds,
    componentId,
    closeButtonId,
}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const {formatMessage} = intl;

    const onClosePressed = useCallback(() => {
        return dismissModal({componentId});
    }, [componentId]);

    useNavButtonPressed(closeButtonId, componentId, onClosePressed, []);
    useAndroidHardwareBackHandler(componentId, onClosePressed);

    const [inputValues, setInputValues] = useState<any>({});
    const [errorTeamUrl, setErrorTeamUrl] = useState<string | undefined>();
    const [errorTeamName, setErrorTeamName] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [buttonDisabled, setButtonDisabled] = useState(false);

    const labelTeamName = formatMessage({
        id: t('mobile.add_team.team_name'),
        defaultMessage: 'Team name',
    });
    const placeholderTeamName = formatMessage({
        id: t('mobile.add_team.team_name_placeholder'),
        defaultMessage: 'Name',
    });

    const labelTeamURL = formatMessage({
        id: t('mobile.add_team.team_url_prefix'),
        defaultMessage: 'Team URL',
    });

    const labelEndpointTeamURL = formatMessage({
        id: t('mobile.add_team.team_url_endpoint'),
        defaultMessage: 'Team URL',
    });

    const refTeamName = useRef<TextInput>(null);
    const refTeamUrl = useRef<TextInput>(null);
    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);
    const mainView = useRef<View>(null);
    const keyboardHeight = useKeyboardHeight();
    const [keyboardVisible, setKeyBoardVisible] = useState(false);

    const blur = useCallback(() => {
        refTeamName.current?.blur();
        refTeamUrl.current?.blur();
        scrollViewRef.current?.scrollToPosition(0, 0, true);
    }, []);

    const onChangeForm = (key: string, value: string) => {
        setInputValues({
            ...inputValues,
            [key]: value,
        });
    };

    const onCreateTeam = async () => {
        const {teamName, teamUrl} = inputValues;

        if (!teamName) {
            setErrorTeamName(
                getCreateTeamErrorMessage(
                    'mobile.add_team.team_name_required',
                    'Please enter team name.',
                ),
            );
            onFocusTeamName();
            return;
        }

        setErrorTeamName('');

        if (!teamUrl) {
            setErrorTeamUrl(
                getCreateTeamErrorMessage(
                    'mobile.add_team.team_url_required',
                    'Please enter team url.',
                ),
            );
            onFocusTeamURL();
            return;
        }

        setErrorTeamUrl('');

        const payload: Partial<Team> = {
            name: teamUrl,
            display_name: teamName,
            type: 'O' as TeamType,
        };

        setIsLoading(true);
        const result = await createTeam(serverUrl, payload as Team);
        setIsLoading(false);

        if ('error' in result) {
            setErrorTeamUrl(
                getCreateTeamErrorMessage(
                    'mobile.add_team.team_url_is_taken',
                    'This URL is taken or unavailable. Please try another.',
                ),
            );
            return;
        }

        setErrorTeamUrl('');
        dismissModal({componentId});
    };

    const getCreateTeamErrorMessage = (id: string, defaultMessage: string) => {
        return intl.formatMessage({
            id,
            defaultMessage,
        });
    };

    const renderProceedButton = useMemo(() => {
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

        let buttonID = t('mobile.add_team.create_team_button');
        let buttonText = 'Create team';
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
                onPress={onCreateTeam}
                containerStyle={[styles.loginButton, styleButtonBackground]}
            >
                {buttonIcon}
                <FormattedText
                    id={buttonID}
                    defaultMessage={buttonText}
                    style={styleButtonText}
                />
            </Button>
        );
    }, [buttonDisabled, inputValues, isLoading, theme]);

    const onFocusTeamName = useCallback(() => {
        refTeamName?.current?.focus();
    }, []);

    const onFocusTeamURL = useCallback(() => {
        refTeamUrl?.current?.focus();
    }, []);

    useEffect(() => {
        if (inputValues.teamName && inputValues.teamUrl) {
            setButtonDisabled(false);
            return;
        }

        setButtonDisabled(true);
    }, [inputValues]);

    useEffect(() => {
        if (keyboardVisible && !keyboardHeight) {
            setKeyBoardVisible(false);
        }
        if (!keyboardVisible && keyboardHeight) {
            setKeyBoardVisible(true);
        }
    }, [keyboardHeight]);

    useEffect(() => {
        onFocusTeamName();
    }, []);

    return (
        <SafeAreaView
            style={styles.container}
            ref={mainView}
        >
            <KeyboardAwareScrollView
                ref={scrollViewRef}
                keyboardShouldPersistTaps={'always'}
                enableAutomaticScroll={!keyboardVisible}
                contentContainerStyle={styles.scrollView}
            >
                <TouchableWithoutFeedback onPress={blur}>
                    <View>
                        <>
                            <FloatingTextInput
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                blurOnSubmit={true}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                label={labelTeamName}
                                placeholder={placeholderTeamName}
                                maxLength={Channel.MAX_CHANNEL_NAME_LENGTH}
                                onSubmitEditing={onFocusTeamURL}
                                error={errorTeamName}
                                keyboardAppearance={getKeyboardAppearanceFromTheme(
                                    theme,
                                )}
                                returnKeyType='next'
                                showErrorIcon={false}
                                spellCheck={false}
                                value={inputValues.teamName || ''}
                                onChangeText={(e: any) =>
                                    onChangeForm('teamName', e)
                                }
                                ref={refTeamName}
                                containerStyle={styles.fieldContainer}
                                theme={theme}
                            />
                            <FormattedText
                                style={[
                                    styles.helpText,
                                    {
                                        marginTop: errorTeamName ? FIELD_MARGIN_BOTTOM + 5 : 10,
                                    },
                                ]}
                                id='mobile.add_team.team_name_description'
                                defaultMessage='Name your team in any language. Your team name shows in menus and headings.'
                            />
                            <View style={[styles.fieldContainer]}>
                                <View
                                    style={{marginBottom: FIELD_MARGIN_BOTTOM}}
                                >
                                    <FloatingTextInput
                                        editable={false}
                                        autoCorrect={false}
                                        autoCapitalize={'none'}
                                        blurOnSubmit={false}
                                        disableFullscreenUI={true}
                                        enablesReturnKeyAutomatically={true}
                                        label={labelTeamURL}
                                        keyboardAppearance={getKeyboardAppearanceFromTheme(
                                            theme,
                                        )}
                                        returnKeyType='next'
                                        showErrorIcon={false}
                                        spellCheck={false}
                                        value={`${serverUrl}/${
                                            inputValues.teamUrl || ''
                                        }`}
                                        theme={theme}
                                    />
                                </View>
                                <View>
                                    <FloatingTextInput
                                        autoCorrect={false}
                                        autoCapitalize={'none'}
                                        blurOnSubmit={true}
                                        disableFullscreenUI={true}
                                        enablesReturnKeyAutomatically={true}
                                        label={labelEndpointTeamURL}
                                        error={errorTeamUrl}
                                        keyboardAppearance={getKeyboardAppearanceFromTheme(
                                            theme,
                                        )}
                                        returnKeyType='done'
                                        onSubmitEditing={onCreateTeam}
                                        showErrorIcon={false}
                                        spellCheck={false}
                                        value={inputValues.teamUrl || ''}
                                        onChangeText={(e: any) =>
                                            onChangeForm('teamUrl', e)
                                        }
                                        ref={refTeamUrl}
                                        theme={theme}
                                    />
                                </View>
                                <FormattedText
                                    style={[
                                        styles.helpText,
                                        {
                                            marginTop: errorTeamUrl ? FIELD_MARGIN_BOTTOM * 2 : FIELD_MARGIN_BOTTOM,
                                        },
                                    ]}
                                    id='mobile.add_team.team_url_description_1'
                                    defaultMessage='Choose the web address of your new team:'
                                />
                                <FormattedText
                                    style={styles.helpText}
                                    id='mobile.add_team.team_url_description_2'
                                    defaultMessage='* Short and memorable is best'
                                />
                                <FormattedText
                                    style={styles.helpText}
                                    id='mobile.add_team.team_url_description_3'
                                    defaultMessage='* Use lowercase letters, numbers and dashes'
                                />
                                <FormattedText
                                    style={styles.helpText}
                                    id='mobile.add_team.team_url_description_4'
                                    defaultMessage='* Must start with a letter and cannot end in a dash'
                                />
                                {renderProceedButton}
                            </View>
                        </>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>
            {/* <Autocomplete
                position={animatedAutocompletePosition}
                updateValue={onHeaderChange}
                cursorPosition={header.length}
                value={header}
                nestedScrollEnabled={true}
                availableSpace={animatedAutocompleteAvailableSpace}
                inPost={false}
                growDown={growDown}
            /> */}
        </SafeAreaView>
    );
}
