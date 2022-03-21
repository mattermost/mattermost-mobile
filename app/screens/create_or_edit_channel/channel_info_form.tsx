// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    LayoutChangeEvent,
    TextInput,
    TouchableWithoutFeedback,
    StatusBar,
    View,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import ErrorText from '@components/error_text';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import SectionItem from '@components/section_item';
import {General, Channel} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
    },
    scrollView: {
        paddingTop: 30,
    },
    errorContainer: {
        width: '100%',
    },
    errorWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    input: {
        color: theme.centerChannelColor,
        fontSize: 14,
        height: 40,
        paddingHorizontal: 15,
    },
    loading: {
        height: 20,
        width: 20,
        color: theme.centerChannelBg,
    },
    textInput: {
        marginTop: 30,
    },
    helpText: {
        fontSize: 14,
        color: changeOpacity(theme.centerChannelColor, 0.5),
        marginTop: 10,
        marginHorizontal: 15,
    },
    headerHelpText: {
        zIndex: -1,
    },
}));

type Props = {
    channelType?: string;
    displayName: string;
    onDisplayNameChange: (text: string) => void;
    editing: boolean;
    error?: string | object;
    header: string;
    onHeaderChange: (text: string) => void;
    onTypeChange: (type: ChannelType) => void;
    purpose: string;
    onPurposeChange: (text: string) => void;
    saving: boolean;
    testID?: string;
    type?: string;
}

export default function ChannelInfoForm({
    channelType,
    displayName,
    onDisplayNameChange,
    editing,
    error,
    header,
    onHeaderChange,
    onTypeChange,
    purpose,
    onPurposeChange,
    saving,
    testID,
    type,
}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const {formatMessage} = intl;

    const nameInput = useRef<TextInput>(null);
    const purposeInput = useRef<TextInput>(null);
    const headerInput = useRef<TextInput>(null);

    const scrollViewRef = useRef<KeyboardAwareScrollView>();

    const [keyboardVisible, setKeyBoardVisible] = useState<boolean>(false);

    const [headerHasFocus, setHeaderHasFocus] = useState<boolean>(false);
    const [headerPosition, setHeaderPosition] = useState<number>();

    const optionalText = formatMessage({id: t('channel_modal.optional'), defaultMessage: '(optional)'});
    const labelDisplayName = formatMessage({id: t('channel_modal.name'), defaultMessage: 'Name'});
    const labelPurpose = formatMessage({id: t('channel_modal.purpose'), defaultMessage: 'Purpose'}) + ' ' + optionalText;
    const labelHeader = formatMessage({id: t('channel_modal.header'), defaultMessage: 'Header'}) + ' ' + optionalText;

    const placeholderDisplayName = formatMessage({id: t('channel_modal.nameEx'), defaultMessage: 'Bugs, Marketing'});
    const placeholderPurpose = formatMessage({id: t('channel_modal.purposeEx'), defaultMessage: 'A channel to file bugs and improvements'});
    const placeholderHeader = formatMessage({id: t('channel_modal.headerEx'), defaultMessage: 'Use Markdown to format header text'});

    const styles = getStyleSheet(theme);

    const displayHeaderOnly = channelType === General.DM_CHANNEL || channelType === General.GM_CHANNEL;
    const showSelector = !displayHeaderOnly && !editing;

    const isPrivate = type === General.PRIVATE_CHANNEL;

    const handlePress = () => {
        const chtype = isPrivate ? General.OPEN_CHANNEL : General.PRIVATE_CHANNEL;
        onTypeChange(chtype);
    };

    const blur = useCallback(() => {
        if (nameInput?.current) {
            nameInput.current.blur();
        }

        if (purposeInput?.current) {
            purposeInput.current.blur();
        }
        if (headerInput?.current) {
            headerInput.current.blur();
        }

        if (scrollViewRef?.current) {
            scrollViewRef.current?.scrollToPosition(0, 0, true);
        }
    }, []);

    const onHeaderLayout = useCallback(({nativeEvent}: LayoutChangeEvent) => {
        setHeaderPosition(nativeEvent.layout.y);
    }, []);

    const scrollHeaderToTop = useCallback(() => {
        if (scrollViewRef?.current) {
            scrollViewRef.current?.scrollToPosition(0, headerPosition as number);
        }
    }, []);

    const onKeyboardDidShow = useCallback(() => {
        setKeyBoardVisible(true);

        if (headerHasFocus) {
            setKeyBoardVisible(true);
            setHeaderHasFocus(false);
            scrollHeaderToTop();
        }
    }, [scrollHeaderToTop]);

    const onKeyboardDidHide = useCallback(() => {
        setKeyBoardVisible(false);
    }, []);

    if (saving) {
        return (
            <View style={styles.container}>
                <StatusBar/>
                <Loading
                    style={styles.loading}
                />
            </View>
        );
    }

    let displayError;
    if (error) {
        displayError = (
            <SafeAreaView
                edges={['bottom', 'left', 'right']}
                style={styles.errorContainer}
            >
                <View style={styles.errorWrapper}>
                    <ErrorText
                        testID='edit_channel_info.error.text'
                        error={error}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles.container}
        >
            <StatusBar/>
            <KeyboardAwareScrollView
                testID={testID}

                // @ts-expect-error legacy ref
                ref={scrollViewRef}
                keyboardShouldPersistTaps={'always'}
                onKeyboardDidShow={onKeyboardDidShow}
                onKeyboardDidHide={onKeyboardDidHide}
                enableAutomaticScroll={!keyboardVisible}
                contentContainerStyle={styles.scrollView}
            >
                {displayError}
                <TouchableWithoutFeedback
                    onPress={blur}
                >
                    <View>
                        {showSelector && (
                            <SectionItem
                                label={(
                                    <FormattedText
                                        id='channel_modal.makePrivate.'
                                        defaultMessage={'Make Private'}
                                    />
                                )}
                                description={(
                                    <FormattedText
                                        id='channel_modal.makePrivate.description'
                                        defaultMessage={'When a channel is set to private, only invited team members can access and participate in that channel'}
                                    />
                                )}
                                action={handlePress}
                                actionType={'toggle'}
                                selected={isPrivate}
                            />
                        )}
                        {!displayHeaderOnly && (
                            <>
                                <FloatingTextInput
                                    autoCorrect={false}
                                    autoCapitalize={'none'}
                                    blurOnSubmit={false}
                                    disableFullscreenUI={true}
                                    enablesReturnKeyAutomatically={true}
                                    label={labelDisplayName}
                                    placeholder={placeholderDisplayName}
                                    onChangeText={onDisplayNameChange}
                                    maxLength={Channel.MAX_CHANNELNAME_LENGTH}
                                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    returnKeyType='next'
                                    showErrorIcon={false}
                                    spellCheck={false}
                                    testID='edit_channel_info.displayname.input'
                                    value={displayName}
                                    ref={nameInput}
                                    containerStyle={styles.textInput}
                                />
                                <FloatingTextInput
                                    autoCorrect={false}
                                    autoCapitalize={'none'}
                                    blurOnSubmit={false}
                                    disableFullscreenUI={true}
                                    enablesReturnKeyAutomatically={true}
                                    label={labelPurpose}
                                    placeholder={placeholderPurpose}
                                    onChangeText={onPurposeChange}
                                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    returnKeyType='next'
                                    showErrorIcon={false}
                                    spellCheck={false}
                                    testID='edit_channel_info.purpose.input'
                                    value={purpose}
                                    ref={purposeInput}
                                    containerStyle={styles.textInput}
                                />
                                <FormattedText
                                    style={styles.helpText}
                                    id='channel_modal.descriptionHelp'
                                    defaultMessage='Describe how this channel should be used.'
                                />
                            </>
                        )}
                        <FloatingTextInput
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            blurOnSubmit={false}
                            disableFullscreenUI={true}
                            enablesReturnKeyAutomatically={true}
                            label={labelHeader}
                            placeholder={placeholderHeader}
                            onChangeText={onHeaderChange}
                            multiline={true}
                            keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                            returnKeyType='next'
                            showErrorIcon={false}
                            spellCheck={false}
                            testID='edit_channel_info.header.input'
                            value={header}
                            onLayout={onHeaderLayout}
                            ref={headerInput}
                            containerStyle={styles.textInput}
                        />
                        <FormattedText
                            style={styles.helpText}
                            id='channel_modal.headerHelp'
                            defaultMessage={'Specify text to appear in the channel header beside the channel name. For example, include frequently used links by typing link text [Link Title](http://example.com).'}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
