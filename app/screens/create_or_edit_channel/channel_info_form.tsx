// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback} from 'react';
import {useIntl} from 'react-intl';
import {
    LayoutChangeEvent,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    View,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
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
    autocomplete: {
        position: undefined,
    },
    autocompleteContainer: {
        position: 'absolute',
        width: '100%',
        flex: 1,
        justifyContent: 'flex-end',
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        paddingTop: 30,
    },
    errorContainer: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        width: '100%',
    },
    errorWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputContainer: {
        marginTop: 10,
        backgroundColor: theme.centerChannelBg,
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
    titleContainer30: {
        flexDirection: 'row',
        marginTop: 30,
    },
    titleContainer15: {
        flexDirection: 'row',
        marginTop: 15,
    },
    title: {
        fontSize: 14,
        color: theme.centerChannelColor,
        marginLeft: 15,
    },
    optional: {
        color: changeOpacity(theme.centerChannelColor, 0.5),
        fontSize: 14,
        marginLeft: 5,
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
    divider: {
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        borderBottomWidth: 1,
        marginHorizontal: 15,
        height: 0,
    },
    touchable: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    touchableText: {
        flex: 1,
        flexGrow: 1,
        fontSize: 16,
        lineHeight: 24,
        color: theme.centerChannelColor,
        paddingVertical: 10,
        marginLeft: 15,
    },
    touchableIcon: {
        flex: 1,
        padding: 10,
        textAlign: 'right',
    },
}));

type Props = {
        channelType?: string;
        displayName: string;
        onDisplayNameChange: (text: string) => void;
        editing: boolean;
        enableRightButton: (enable: boolean) => void;
        error?: string | object;
        header: string;
        onHeaderChange: (text: string) => void;
        onTypeChange: (type: ChannelType) => void;
        oldDisplayName?: string;
        oldHeader?: string;
        oldPurpose?: string;
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
    enableRightButton,
    error,
    header,
    onHeaderChange,
    onTypeChange,
    oldDisplayName,
    oldHeader,
    oldPurpose,
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

    // const [keyboardPosition, setKeyBoardPosition] = useState<number>(0);
    const [keyboardVisible, setKeyBoardVisible] = useState<boolean>(false);

    const [headerHasFocus, setHeaderHasFocus] = useState<boolean>(false);
    const [headerPosition, setHeaderPosition] = useState<number>();
    const [isPrivate, setIsPrivate] = useState<boolean>(false);

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

    const handlePress = () => {
        setIsPrivate(!isPrivate);
        const chtype = isPrivate ? General.OPEN_CHANNEL : General.PRIVATE_CHANNEL;
        onTypeSelect(chtype as ChannelType);
    };

    const blur = () => {
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
    };

    const canUpdate = (currentDisplayName?: string, currentPurpose?: string, currentHeader?: string) => {
        return currentDisplayName !== oldDisplayName ||
            currentPurpose !== oldPurpose || currentHeader !== oldHeader;
    };

    const onDisplayNameChangeText = useCallback((text: string) => {
        onDisplayNameChange(text);
        if (editing) {
            enableRightButton(canUpdate(text, purpose, header));
            return;
        }
        const displayNameExists = text?.length >= 2;
        enableRightButton(displayNameExists);
    }, [purpose, header]);

    const onPurposeChangeText = useCallback((text: string) => {
        onPurposeChange(text);
        if (editing) {
            enableRightButton(canUpdate(displayName, text, header));
        }
    }, [displayName, header]);

    const onHeaderChangeText = useCallback((text: string) => {
        onHeaderChange(text);
        if (editing) {
            enableRightButton(canUpdate(displayName, purpose, text));
        }
    }, [displayName, purpose]);

    const onTypeSelect = (text: ChannelType) => {
        onTypeChange(text);
    };

    const onHeaderLayout = ({nativeEvent}: LayoutChangeEvent) => {
        setHeaderPosition(nativeEvent.layout.y);
    };

    const scrollHeaderToTop = () => {
        if (scrollViewRef?.current) {
            scrollViewRef.current?.scrollToPosition(0, headerPosition as number);
        }
    };

    const onKeyboardDidShow = () => {
        setKeyBoardVisible(true);

        if (headerHasFocus) {
            setKeyBoardVisible(true);
            setHeaderHasFocus(false);
            scrollHeaderToTop();
        }
    };

    const onKeyboardDidHide = () => {
        setKeyBoardVisible(false);
    };

    const onHeaderFocus = () => {
        if (keyboardVisible) {
            scrollHeaderToTop();
        } else {
            setHeaderHasFocus(true);
        }
    };

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
                        theme={theme}
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
                style={styles.container}
                keyboardShouldPersistTaps={'always'}
                onKeyboardDidShow={onKeyboardDidShow}
                onKeyboardDidHide={onKeyboardDidHide}
                enableAutomaticScroll={!keyboardVisible}
            >
                {displayError}
                <TouchableWithoutFeedback onPress={blur}>
                    <View style={styles.scrollView}>
                        {showSelector && (
                            <View>
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
                            </View>
                        )}
                        {!displayHeaderOnly && (
                            <View>
                                <View style={styles.titleContainer30}/>
                                <FloatingTextInput
                                    autoCorrect={false}
                                    autoCapitalize={'none'}
                                    blurOnSubmit={false}
                                    disableFullscreenUI={true}
                                    enablesReturnKeyAutomatically={true}
                                    label={labelDisplayName}
                                    placeholder={placeholderDisplayName}
                                    onChangeText={onDisplayNameChangeText}
                                    maxLength={Channel.MAX_CHANNELNAME_LENGTH}
                                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    returnKeyType='next'
                                    showErrorIcon={false}
                                    spellCheck={false}
                                    testID='edit_channel_info.displayname.input'
                                    theme={theme}
                                    value={displayName}
                                />
                                <View style={styles.titleContainer30}/>

                                <FloatingTextInput
                                    autoCorrect={false}
                                    autoCapitalize={'none'}
                                    blurOnSubmit={false}
                                    disableFullscreenUI={true}
                                    enablesReturnKeyAutomatically={true}
                                    label={labelPurpose}
                                    placeholder={placeholderPurpose}
                                    onChangeText={onPurposeChangeText}
                                    maxLength={Channel.MAX_CHANNELNAME_LENGTH}
                                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    returnKeyType='next'
                                    showErrorIcon={false}
                                    spellCheck={false}
                                    testID='edit_channel_info.purpose.input'
                                    theme={theme}
                                    value={purpose}
                                />
                                <View>
                                    <FormattedText
                                        style={styles.helpText}
                                        id='channel_modal.descriptionHelp'
                                        defaultMessage='Describe how this channel should be used.'
                                    />
                                </View>
                            </View>
                        )}
                        <View
                            onLayout={onHeaderLayout}
                            style={styles.titleContainer30}
                        >
                            <FloatingTextInput
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                blurOnSubmit={false}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                label={labelHeader}
                                placeholder={placeholderHeader}
                                onChangeText={onHeaderChangeText}
                                maxLength={Channel.MAX_CHANNELNAME_LENGTH}
                                multiline={true}
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                returnKeyType='next'
                                showErrorIcon={false}
                                style={styles.input}
                                spellCheck={false}
                                testID='edit_channel_info.header.input'
                                theme={theme}
                                value={header}
                            />
                        </View>
                        <View style={styles.headerHelpText}>
                            <FormattedText
                                style={styles.helpText}
                                id='channel_modal.headerHelp'
                                defaultMessage={'Specify text to appear in the channel header beside the channel name. For example, include frequently used links by typing link text [Link Title](http://example.com).'}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}
