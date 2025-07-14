// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useRef, useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {
    type LayoutChangeEvent,
    TextInput,
    TouchableWithoutFeedback,
    StatusBar,
    View,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
    Platform,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {SafeAreaView} from 'react-native-safe-area-context';

import Autocomplete from '@components/autocomplete';
import ErrorText from '@components/error_text';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import OptionItem from '@components/option_item';
import {General, Channel} from '@constants';
import {useTheme} from '@context/theme';
import {useAutocompleteDefaultAnimatedValues} from '@hooks/autocomplete';
import {useKeyboardHeight, useKeyboardOverlap} from '@hooks/device';
import {useInputPropagation} from '@hooks/input';
import {t} from '@i18n';
import {
    changeOpacity,
    makeStyleSheetFromTheme,
    getKeyboardAppearanceFromTheme,
} from '@utils/theme';
import {typography} from '@utils/typography';

const FIELD_MARGIN_BOTTOM = 24;
const MAKE_PRIVATE_MARGIN_BOTTOM = 32;
const BOTTOM_AUTOCOMPLETE_SEPARATION = Platform.select({ios: 10, default: 10});
const LIST_PADDING = 32;
const AUTOCOMPLETE_ADJUST = 5;

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
    },
    scrollView: {
        paddingVertical: LIST_PADDING,
        paddingHorizontal: 20,
    },
    errorContainer: {
        width: '100%',
    },
    errorWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    makePrivateContainer: {
        marginBottom: MAKE_PRIVATE_MARGIN_BOTTOM,
    },
    fieldContainer: {
        marginBottom: FIELD_MARGIN_BOTTOM,
    },
    helpText: {
        ...typography('Body', 75, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.5),
        marginTop: 8,
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

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const nameInput = useRef<TextInput>(null);
    const purposeInput = useRef<TextInput>(null);
    const headerInput = useRef<TextInput>(null);

    const scrollViewRef = useRef<KeyboardAwareScrollView>(null);

    const updateScrollTimeout = useRef<NodeJS.Timeout>();

    const mainView = useRef<View>(null);
    const [wrapperHeight, setWrapperHeight] = useState(0);
    const keyboardOverlap = useKeyboardOverlap(mainView, wrapperHeight);

    const [propagateValue, shouldProcessEvent] = useInputPropagation();

    const keyboardHeight = useKeyboardHeight();
    const [keyboardVisible, setKeyBoardVisible] = useState(false);
    const [scrollPosition, setScrollPosition] = useState(0);

    const [errorHeight, setErrorHeight] = useState(0);
    const [displayNameFieldHeight, setDisplayNameFieldHeight] = useState(0);
    const [makePrivateHeight, setMakePrivateHeight] = useState(0);
    const [purposeFieldHeight, setPurposeFieldHeight] = useState(0);
    const [headerFieldHeight, setHeaderFieldHeight] = useState(0);
    const [headerPosition, setHeaderPosition] = useState(0);

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

    const scrollHeaderToTop = useCallback(() => {
        if (scrollViewRef?.current) {
            scrollViewRef.current?.scrollToPosition(0, headerPosition);
        }
    }, [headerPosition]);

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

    useEffect(() => {
        if (keyboardVisible && !keyboardHeight) {
            setKeyBoardVisible(false);
        }
        if (!keyboardVisible && keyboardHeight) {
            setKeyBoardVisible(true);
        }
    }, [keyboardHeight]);

    const onHeaderAutocompleteChange = useCallback((value: string) => {
        onHeaderChange(value);
        propagateValue(value);
    }, [onHeaderChange]);

    const onHeaderInputChange = useCallback((value: string) => {
        if (!shouldProcessEvent(value)) {
            return;
        }
        onHeaderChange(value);
    }, [onHeaderChange]);

    const onLayoutError = useCallback((e: LayoutChangeEvent) => {
        setErrorHeight(e.nativeEvent.layout.height);
    }, []);
    const onLayoutMakePrivate = useCallback((e: LayoutChangeEvent) => {
        setMakePrivateHeight(e.nativeEvent.layout.height);
    }, []);
    const onLayoutDisplayName = useCallback((e: LayoutChangeEvent) => {
        setDisplayNameFieldHeight(e.nativeEvent.layout.height);
    }, []);
    const onLayoutPurpose = useCallback((e: LayoutChangeEvent) => {
        setPurposeFieldHeight(e.nativeEvent.layout.height);
    }, []);
    const onLayoutHeader = useCallback((e: LayoutChangeEvent) => {
        setHeaderFieldHeight(e.nativeEvent.layout.height);
        setHeaderPosition(e.nativeEvent.layout.y);
    }, []);
    const onLayoutWrapper = useCallback((e: LayoutChangeEvent) => {
        setWrapperHeight(e.nativeEvent.layout.height);
    }, []);

    const otherElementsSize = LIST_PADDING + errorHeight +
        (showSelector ? makePrivateHeight + MAKE_PRIVATE_MARGIN_BOTTOM : 0) +
        (displayHeaderOnly ? 0 : purposeFieldHeight + FIELD_MARGIN_BOTTOM + displayNameFieldHeight + FIELD_MARGIN_BOTTOM);

    const workingSpace = wrapperHeight - keyboardOverlap;
    const spaceOnTop = otherElementsSize - scrollPosition - AUTOCOMPLETE_ADJUST;
    const spaceOnBottom = (workingSpace + scrollPosition) - (otherElementsSize + headerFieldHeight + BOTTOM_AUTOCOMPLETE_SEPARATION);

    const autocompletePosition = spaceOnBottom > spaceOnTop ?
        (otherElementsSize + headerFieldHeight) - scrollPosition :
        (workingSpace + scrollPosition + AUTOCOMPLETE_ADJUST + keyboardOverlap) - otherElementsSize;
    const autocompleteAvailableSpace = spaceOnBottom > spaceOnTop ? spaceOnBottom : spaceOnTop;
    const growDown = spaceOnBottom > spaceOnTop;

    const [animatedAutocompletePosition, animatedAutocompleteAvailableSpace] = useAutocompleteDefaultAnimatedValues(autocompletePosition, autocompleteAvailableSpace);

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
                onLayout={onLayoutError}
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
            testID='create_or_edit_channel.screen'
            onLayout={onLayoutWrapper}
            ref={mainView}
        >
            <KeyboardAwareScrollView
                testID={'create_or_edit_channel.scroll_view'}
                ref={scrollViewRef}
                keyboardShouldPersistTaps={'always'}
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
                            <OptionItem
                                testID='channel_info_form.make_private'
                                label={makePrivateLabel}
                                description={makePrivateDescription}
                                action={handlePress}
                                type={'toggle'}
                                selected={isPrivate}
                                icon={'lock-outline'}
                                containerStyle={styles.makePrivateContainer}
                                onLayout={onLayoutMakePrivate}
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
                                    containerStyle={styles.fieldContainer}
                                    theme={theme}
                                    onLayout={onLayoutDisplayName}
                                />
                                <View
                                    style={styles.fieldContainer}
                                    onLayout={onLayoutPurpose}
                                >
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
                                        theme={theme}
                                    />
                                    <FormattedText
                                        style={styles.helpText}
                                        id='channel_modal.descriptionHelp'
                                        defaultMessage='Describe how this channel should be used.'
                                        testID='channel_info_form.purpose.description'
                                    />
                                </View>
                            </>
                        )}
                        <View
                            style={styles.fieldContainer}
                        >
                            <FloatingTextInput
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                blurOnSubmit={false}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                label={labelHeader}
                                placeholder={placeholderHeader}
                                onChangeText={onHeaderInputChange}
                                multiline={true}
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                returnKeyType='next'
                                showErrorIcon={false}
                                spellCheck={false}
                                testID='channel_info_form.header.input'
                                value={header}
                                ref={headerInput}
                                theme={theme}
                                onFocus={scrollHeaderToTop}
                                onLayout={onLayoutHeader}
                            />
                            <FormattedText
                                style={styles.helpText}
                                id='channel_modal.headerHelp'
                                defaultMessage={'Specify text to appear in the channel header beside the channel name. For example, include frequently used links by typing link text [Link Title](http://example.com).'}
                                testID='channel_info_form.header.description'

                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>
            <Autocomplete
                position={animatedAutocompletePosition}
                updateValue={onHeaderAutocompleteChange}
                cursorPosition={header.length}
                value={header}
                nestedScrollEnabled={true}
                availableSpace={animatedAutocompleteAvailableSpace}
                shouldDirectlyReact={false}
                growDown={growDown}
            />
        </SafeAreaView>
    );
}
