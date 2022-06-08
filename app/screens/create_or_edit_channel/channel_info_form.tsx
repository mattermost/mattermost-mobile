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
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import BlockItem from '@components/block_item';
import ErrorText from '@components/error_text';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {General, Channel} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import useHeaderHeight from '@hooks/header';
import {t} from '@i18n';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
    },
    scrollView: {
        paddingVertical: 30,
        paddingHorizontal: 20,
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
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textInput: {
        marginTop: 30,
    },
    helpText: {
        ...typography('Body', 400, 'Regular'),
        fontSize: 12,
        lineHeight: 16,
        color: changeOpacity(theme.centerChannelColor, 0.5),
        marginTop: 10,
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
    headerOnly?: boolean;
    onHeaderChange: (text: string) => void;
    onTypeChange: (type: ChannelType) => void;
    purpose: string;
    onPurposeChange: (text: string) => void;
    saving: boolean;
    type?: string;
}

export default function ChannelInfoForm({
    channelType,
    displayName,
    onDisplayNameChange,
    editing,
    error,
    header,
    headerOnly,
    onHeaderChange,
    onTypeChange,
    purpose,
    onPurposeChange,
    saving,
    type,
}: Props) {
    const intl = useIntl();
    const {formatMessage} = intl;
    const isTablet = useIsTablet();
    const headerHeight = useHeaderHeight();

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const nameInput = useRef<TextInput>(null);
    const purposeInput = useRef<TextInput>(null);
    const headerInput = useRef<TextInput>(null);

    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

    const updateScrollTimeout = useRef<NodeJS.Timeout>();

    const [keyboardVisible, setKeyBoardVisible] = useState<boolean>(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [scrollPosition, setScrollPosition] = useState(0);

    const [headerPosition, setHeaderPosition] = useState<number>(0);

    const optionalText = formatMessage({id: t('channel_modal.optional'), defaultMessage: '(optional)'});
    const labelDisplayName = formatMessage({id: t('channel_modal.name'), defaultMessage: 'Name'});
    const labelPurpose = formatMessage({id: t('channel_modal.purpose'), defaultMessage: 'Purpose'}) + ' ' + optionalText;
    const labelHeader = formatMessage({id: t('channel_modal.header'), defaultMessage: 'Header'}) + ' ' + optionalText;

    const placeholderDisplayName = formatMessage({id: t('channel_modal.nameEx'), defaultMessage: 'Bugs, Marketing'});
    const placeholderPurpose = formatMessage({id: t('channel_modal.purposeEx'), defaultMessage: 'A channel to file bugs and improvements'});
    const placeholderHeader = formatMessage({id: t('channel_modal.headerEx'), defaultMessage: 'Use Markdown to format header text'});

    const makePrivateLabel = formatMessage({id: t('channel_modal.makePrivate.label'), defaultMessage: 'Make Private'});
    const makePrivateDescription = formatMessage({id: t('channel_modal.makePrivate.description'), defaultMessage: 'When a channel is set to private, only invited team members can access and participate in that channel.'});

    const displayHeaderOnly = headerOnly || channelType === General.DM_CHANNEL || channelType === General.GM_CHANNEL;
    const showSelector = !displayHeaderOnly && !editing;

    const isPrivate = type === General.PRIVATE_CHANNEL;

    const handlePress = () => {
        const chtype = isPrivate ? General.OPEN_CHANNEL : General.PRIVATE_CHANNEL;
        onTypeChange(chtype);
    };

    const blur = useCallback(() => {
        nameInput.current?.blur();
        purposeInput.current?.blur();
        headerInput.current?.blur();
        scrollViewRef.current?.scrollToPosition(0, 0, true);
    }, []);

    const onHeaderLayout = useCallback(({nativeEvent}: LayoutChangeEvent) => {
        setHeaderPosition(nativeEvent.layout.y);
    }, []);

    const scrollHeaderToTop = useCallback(() => {
        if (scrollViewRef?.current) {
            scrollViewRef.current?.scrollToPosition(0, headerPosition);
        }
    }, []);

    const onKeyboardDidShow = useCallback((frames: any) => {
        setKeyBoardVisible(true);
        if (Platform.OS === 'android') {
            setKeyboardHeight(frames.endCoordinates.height);
        }
    }, [scrollHeaderToTop]);

    const onKeyboardDidHide = useCallback(() => {
        setKeyBoardVisible(false);
        setKeyboardHeight(0);
    }, []);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const pos = e.nativeEvent.contentOffset.y;
        if (updateScrollTimeout.current) {
            clearTimeout(updateScrollTimeout.current);
        }
        updateScrollTimeout.current = setTimeout(() => {
            setScrollPosition(pos);
            updateScrollTimeout.current = undefined;
        }, 200);
    }, []);

    if (saving) {
        return (
            <View style={styles.container}>
                <StatusBar/>
                <Loading
                    containerStyle={styles.loading}
                    color={theme.centerChannelColor}
                    size='large'
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
    const platformHeaderHeight = headerHeight.defaultHeight + Platform.select({ios: 10, default: headerHeight.defaultHeight + 10});
    const postInputTop = (headerPosition + scrollPosition + platformHeaderHeight) - keyboardHeight;

    return (
        <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles.container}
            testID='create_or_edit_channel.screen'
        >
            <KeyboardAwareScrollView
                testID={'create_or_edit_channel.scrollview'}
                ref={scrollViewRef}
                keyboardShouldPersistTaps={'always'}
                onKeyboardDidShow={onKeyboardDidShow}
                onKeyboardDidHide={onKeyboardDidHide}
                enableAutomaticScroll={!keyboardVisible}
                contentContainerStyle={styles.scrollView}
                onScroll={onScroll}
            >
                {displayError}
                <TouchableWithoutFeedback
                    onPress={blur}
                >
                    <View>
                        {showSelector && (
                            <BlockItem
                                testID='channel_info_form.make_private'
                                label={makePrivateLabel}
                                description={makePrivateDescription}
                                action={handlePress}
                                actionType={'toggle'}
                                selected={isPrivate}
                                icon={'lock-outline'}
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
                                    maxLength={Channel.MAX_CHANNEL_NAME_LENGTH}
                                    keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    returnKeyType='next'
                                    showErrorIcon={false}
                                    spellCheck={false}
                                    testID='channel_info_form.display_name.input'
                                    value={displayName}
                                    ref={nameInput}
                                    containerStyle={styles.textInput}
                                    theme={theme}
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
                                    testID='channel_info_form.purpose.input'
                                    value={purpose}
                                    ref={purposeInput}
                                    containerStyle={styles.textInput}
                                    theme={theme}
                                />
                                <FormattedText
                                    style={styles.helpText}
                                    id='channel_modal.descriptionHelp'
                                    defaultMessage='Describe how this channel should be used.'
                                    testID='channel_info_form.purpose.description'
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
                            testID='channel_info_form.header.input'
                            value={header}
                            onLayout={onHeaderLayout}
                            ref={headerInput}
                            containerStyle={styles.textInput}
                            theme={theme}
                        />
                        <FormattedText
                            style={styles.helpText}
                            id='channel_modal.headerHelp'
                            defaultMessage={'Specify text to appear in the channel header beside the channel name. For example, include frequently used links by typing link text [Link Title](http://example.com).'}
                            testID='channel_info_form.header.description'
                        />
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>
            <View>
                <Autocomplete
                    postInputTop={postInputTop}
                    updateValue={onHeaderChange}
                    cursorPosition={header.length}
                    value={header}
                    nestedScrollEnabled={true}
                    maxHeightOverride={isTablet ? 200 : undefined}
                    inPost={false}
                    fixedBottomPosition={false}
                />
            </View>
        </SafeAreaView>
    );
}
