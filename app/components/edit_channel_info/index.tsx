// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import React, {useState, useRef} from 'react';
import {useIntl} from 'react-intl';
import {
    LayoutChangeEvent,
    Platform,
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
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {General, Channel} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {popTopScreen, dismissModal} from '@screens/navigation';
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
        color: '#3d3c40',
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
        channelURL?: string;
        displayName?: string;
        editing?: boolean;
        enableRightButton: (val: boolean) => void;
        error?: string | object;
        header?: string;
        onDisplayNameChange: (val: string) => void;
        onHeaderChange: (val: string) => void;
        onPurposeChange: (val: string) => void;
        onTypeChange: (val: string) => void;
        oldChannelURL?: string;
        oldDisplayName?: string;
        oldHeader?: string;
        oldPurpose?: string;
        purpose?: string;
        saving: boolean;
        testID?: string;
        type?: string;
}

const EditChannelInfo = ({channelType, channelURL, displayName, editing = false, enableRightButton, error, header, onDisplayNameChange, onHeaderChange, onPurposeChange, onTypeChange, oldChannelURL, oldDisplayName, oldHeader, oldPurpose, purpose, saving, testID, type}: Props) => {
    const theme = useTheme();
    const intl = useIntl();

    const nameInput = useRef<TextInput>(null);

    // const urlInput = React.createRef();
    const purposeInput = useRef<TextInput>(null);
    const headerInput = useRef<TextInput>(null);
    const scroll = useRef();

    const [keyboardVisible, setKeyBoardVisible] = useState<boolean>(false);
    const [keyboardPosition, setKeyBoardPosition] = useState<number>(0);
    const [headerHasFocus, setHeaderHasFocus] = useState<boolean>(false);
    const [headerPosition, setHeaderPosition] = useState<number>();

    const blur = () => {
        if (nameInput?.current) {
            nameInput.current.blur();
        }

        // TODO: uncomment below once the channel URL field is added
        // if (this.urlInput?.current) {
        //     this.urlInput.current.blur();
        // }

        if (purposeInput?.current) {
            purposeInput.current.blur();
        }
        if (headerInput?.current) {
            headerInput.current.blur();
        }

        if (scroll?.current) {
            scroll.current.scrollTo({x: 0, y: 0, animated: true});
        }
    };

    const canUpdate = () => {
        return displayName !== oldDisplayName || channelURL !== oldChannelURL ||
            purpose !== oldPurpose || header !== oldHeader;
    };

    const onDisplayNameChangeText = (displayNameText: string) => {
        onDisplayNameChange(displayNameText);
        if (editing) {
            enableRightButton(canUpdate());
            return;
        }

        const displayNameExists = displayNameText && displayNameText.length >= 2;
        enableRightButton(Boolean(displayNameExists));
    };

    const onPurposeChangeText = (purposeText: string) => {
        onPurposeChange(purposeText);
        if (editing) {
            enableRightButton(canUpdate());
        }
    };

    const onHeaderChangeText = (headerText: string) => {
        onHeaderChange(headerText);
        if (editing) {
            enableRightButton(canUpdate());
        }
    };

    const onTypeSelect = (typeText: string) => {
        onTypeChange(typeText);
    };

    const onHeaderLayout = ({nativeEvent}: LayoutChangeEvent) => {
        setHeaderPosition(nativeEvent.layout.y);
    };

    const scrollHeaderToTop = () => {
        if (scroll.current) {
            scroll.current.scrollTo({x: 0, y: headerPosition});
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

    // TODO: autocomplete
    // const onKeyboardOffsetChanged = () => {
    //     setKeyBoardPosition(keyboardPosition);
    // };

    // TODO: autocomplete
    // const bottomStyle = {
    //     bottom: Platform.select({
    //         ios: keyboardPosition,
    //         android: 0,
    //     }),
    // };

    const styles = getStyleSheet(theme);

    const displayHeaderOnly = channelType === General.DM_CHANNEL || channelType === General.GM_CHANNEL;
    const showSelector = !displayHeaderOnly && onTypeChange;

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
                ref={scroll}
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
                                <View>
                                    <FormattedText
                                        style={styles.title}
                                        id='channel_modal.channelType'
                                        defaultMessage='Type'
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <TouchableOpacity
                                        style={styles.touchable}
                                        onPress={() => {
                                            onTypeSelect(General.OPEN_CHANNEL);
                                        }}
                                        testID='edit_channel_info.type.public.action'
                                    >
                                        <FormattedText
                                            style={styles.touchableText}
                                            id='channel_modal.type.public'
                                            defaultMessage='Public Channel'
                                        />
                                        {type === General.OPEN_CHANNEL &&
                                        <CompassIcon
                                            style={styles.touchableIcon}
                                            color='#166de0'
                                            name='check'
                                            size={24}
                                        />
                                        }
                                    </TouchableOpacity>
                                    <View
                                        style={{borderBottomColor: '#ebebec',
                                            borderBottomWidth: 1,
                                            marginHorizontal: 15,
                                            height: 0}}
                                    />
                                    <TouchableOpacity
                                        style={styles.touchable}
                                        onPress={() => {
                                            onTypeSelect(General.PRIVATE_CHANNEL);
                                        }}
                                        testID='edit_channel_info.type.private.action'
                                    >
                                        <FormattedText
                                            style={styles.touchableText}
                                            id='channel_modal.type.private'
                                            defaultMessage='Private Channel'
                                        />
                                        {type === General.PRIVATE_CHANNEL &&
                                        <CompassIcon
                                            style={styles.touchableIcon}
                                            color='#166de0'
                                            name='check'
                                            size={24}
                                        />
                                        }
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {!displayHeaderOnly && (
                            <View>
                                <View style={styles.titleContainer30}>
                                    <FormattedText
                                        style={styles.title}
                                        id='channel_modal.name'
                                        defaultMessage='Name'
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        value={displayName}
                                        onChangeText={onDisplayNameChangeText}
                                        style={styles.input}
                                        autoCapitalize='none'
                                        autoCorrect={false}
                                        placeholder={intl.formatMessage({id: t('channel_modal.nameEx'), defaultMessage: 'E.g.: "Bugs", "Marketing", "客户支持"'})}
                                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                                        underlineColorAndroid='transparent'
                                        disableFullscreenUI={true}
                                        maxLength={Channel.MAX_CHANNELNAME_LENGTH}
                                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    />
                                </View>

                                <View style={styles.titleContainer30}>
                                    <FormattedText
                                        style={styles.title}
                                        id='channel_modal.purpose'
                                        defaultMessage='Purpose'
                                    />
                                    <FormattedText
                                        style={styles.optional}
                                        id='channel_modal.optional'
                                        defaultMessage='(optional)'
                                    />
                                </View>
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        allowFontScaling={true}
                                        testID='edit_channel_info.purpose.input'
                                        ref={purposeInput}
                                        value={purpose}
                                        onChangeText={onPurposeChangeText}
                                        style={[styles.input, {height: 110}]}
                                        autoCapitalize='none'
                                        autoCorrect={false}
                                        placeholder={intl.formatMessage({id: t('channel_modal.purposeEx'), defaultMessage: 'E.g.: "A channel to file bugs and improvements"'})}
                                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                                        multiline={true}
                                        blurOnSubmit={false}
                                        textAlignVertical='top'
                                        underlineColorAndroid='transparent'
                                        disableFullscreenUI={true}
                                        keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                                    />
                                </View>
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
                            style={styles.titleContainer15}
                        >
                            <FormattedText
                                style={styles.title}
                                id='channel_modal.header'
                                defaultMessage='Header'
                            />
                            <FormattedText
                                style={styles.optional}
                                id='channel_modal.optional'
                                defaultMessage='(optional)'
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <TextInput
                                allowFontScaling={true}
                                testID='edit_channel_info.header.input'
                                ref={headerInput}
                                value={header}
                                onChangeText={onHeaderChangeText}
                                style={[styles.input, {height: 110}]}
                                autoCapitalize='none'
                                autoCorrect={false}
                                placeholder={intl.formatMessage({id: t('channel_modal.headerEx'), defaultMessage: 'E.g.: "[Link Title](http://example.com)"'})}
                                placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                                multiline={true}
                                blurOnSubmit={false}
                                onFocus={onHeaderFocus}
                                textAlignVertical='top'
                                underlineColorAndroid='transparent'
                                disableFullscreenUI={true}
                                keyboardAppearance={getKeyboardAppearanceFromTheme(theme)}
                            />
                        </View>
                        <View style={styles.headerHelpText}>
                            <FormattedText
                                style={styles.helpText}
                                id='channel_modal.headerHelp'
                                defaultMessage={'Set text that will appear in the header of the channel beside the channel name. For example, include frequently used links by typing [Link Title](http://example.com).'}
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAwareScrollView>

            {/* TODO add autocomplete */}
            {/* <View style={[styles.autocompleteContainer, bottomStyle]}> */}
            {/*     <Autocomplete */}
            {/*         cursorPosition={header.length} */}
            {/*         maxHeight={DEVICE.AUTOCOMPLETE_MAX_HEIGHT} */}
            {/*         onChangeText={onHeaderChangeText} */}
            {/*         value={header} */}
            {/*         nestedScrollEnabled={true} */}
            {/*         onKeyboardOffsetChanged={onKeyboardOffsetChanged} */}
            {/*         offsetY={8} */}
            {/*         style={styles.autocomplete} */}
            {/*     /> */}
            {/* </View> */}
        </SafeAreaView>
    );
};

export default EditChannelInfo;
