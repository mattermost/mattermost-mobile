// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Platform,
    TouchableWithoutFeedback,
    View,
    Text,
    findNodeHandle,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {General} from 'mattermost-redux/constants';
import {getShortenedURL} from 'app/utils/url';

export default class EditChannelInfo extends PureComponent {
    static propTypes = {
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        channelType: PropTypes.string,
        enableRightButton: PropTypes.func,
        saving: PropTypes.bool.isRequired,
        editing: PropTypes.bool,
        error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
        displayName: PropTypes.string,
        currentTeamUrl: PropTypes.string,
        channelURL: PropTypes.string,
        purpose: PropTypes.string,
        header: PropTypes.string,
        onDisplayNameChange: PropTypes.func,
        onChannelURLChange: PropTypes.func,
        onPurposeChange: PropTypes.func,
        onHeaderChange: PropTypes.func,
        oldDisplayName: PropTypes.string,
        oldChannelURL: PropTypes.string,
        oldHeader: PropTypes.string,
        oldPurpose: PropTypes.string,
    };

    static defaultProps = {
        editing: false,
    };

    blur = () => {
        if (this.nameInput) {
            this.nameInput.refs.wrappedInstance.blur();
        }

        // TODO: uncomment below once the channel URL field is added
        // if (this.urlInput) {
        //     this.urlInput.refs.wrappedInstance.blur();
        // }
        if (this.purposeInput) {
            this.purposeInput.refs.wrappedInstance.blur();
        }
        if (this.headerInput) {
            this.headerInput.refs.wrappedInstance.blur();
        }
        if (this.scroll) {
            this.scroll.scrollToPosition(0, 0, true);
        }
    };

    channelNameRef = (ref) => {
        this.nameInput = ref;
    };

    channelURLRef = (ref) => {
        this.urlInput = ref;
    };

    channelPurposeRef = (ref) => {
        this.purposeInput = ref;
    };

    channelHeaderRef = (ref) => {
        this.headerInput = ref;
    };

    close = (goBack = false) => {
        EventEmitter.emit('closing-create-channel', false);
        if (goBack) {
            this.props.navigator.pop({animated: true});
        } else {
            this.props.navigator.dismissModal({
                animationType: 'slide-down',
            });
        }
    };

    lastTextRef = (ref) => {
        this.lastText = ref;
    };

    canUpdate = (displayName, channelURL, purpose, header) => {
        const {
            oldDisplayName,
            oldChannelURL,
            oldPurpose,
            oldHeader,
        } = this.props;

        return displayName !== oldDisplayName || channelURL !== oldChannelURL ||
            purpose !== oldPurpose || header !== oldHeader;
    };

    enableRightButton = (enable = false) => {
        this.props.enableRightButton(enable);
    };

    onDisplayNameChangeText = (displayName) => {
        const {editing, onDisplayNameChange} = this.props;
        onDisplayNameChange(displayName);

        if (editing) {
            const {channelURL, purpose, header} = this.props;
            const canUpdate = this.canUpdate(displayName, channelURL, purpose, header);
            this.enableRightButton(canUpdate);
            return;
        }

        const displayNameExists = displayName && displayName.length >= 2;
        this.props.enableRightButton(displayNameExists);
    };

    onDisplayURLChangeText = (channelURL) => {
        const {editing, onChannelURLChange} = this.props;
        onChannelURLChange(channelURL);

        if (editing) {
            const {displayName, purpose, header} = this.props;
            const canUpdate = this.canUpdate(displayName, channelURL, purpose, header);
            this.enableRightButton(canUpdate);
        }
    };

    onPurposeChangeText = (purpose) => {
        const {editing, onPurposeChange} = this.props;
        onPurposeChange(purpose);

        if (editing) {
            const {displayName, channelURL, header} = this.props;
            const canUpdate = this.canUpdate(displayName, channelURL, purpose, header);
            this.enableRightButton(canUpdate);
        }
    };

    onHeaderChangeText = (header) => {
        const {editing, onHeaderChange} = this.props;
        onHeaderChange(header);

        if (editing) {
            const {displayName, channelURL, purpose} = this.props;
            const canUpdate = this.canUpdate(displayName, channelURL, purpose, header);
            this.enableRightButton(canUpdate);
        }
    };

    scrollRef = (ref) => {
        this.scroll = ref;
    };

    scrollToEnd = () => {
        if (this.scroll && this.lastText) {
            this.scroll.scrollToFocusedInput(findNodeHandle(this.lastText));
        }
    };

    render() {
        const {
            theme,
            editing,
            channelType,
            currentTeamUrl,
            deviceWidth,
            deviceHeight,
            displayName,
            channelURL,
            header,
            purpose,
        } = this.props;
        const {error, saving} = this.props;
        const fullUrl = currentTeamUrl + '/channels';
        const shortUrl = getShortenedURL(fullUrl, 35);

        const style = getStyleSheet(theme);

        const displayHeaderOnly = channelType === General.DM_CHANNEL ||
            channelType === General.GM_CHANNEL;

        if (saving) {
            return (
                <View style={style.container}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={[style.errorContainer, {width: deviceWidth}]}>
                    <View style={style.errorWrapper}>
                        <ErrorText error={error}/>
                    </View>
                </View>
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                <KeyboardAwareScrollView
                    ref={this.scrollRef}
                    style={style.container}
                >
                    {displayError}
                    <TouchableWithoutFeedback onPress={this.blur}>
                        <View style={[style.scrollView, {height: deviceHeight + (Platform.OS === 'android' ? 200 : 0)}]}>
                            {!displayHeaderOnly && (
                                <View>
                                    <View>
                                        <FormattedText
                                            style={style.title}
                                            id='channel_modal.name'
                                            defaultMessage='Name'
                                        />
                                    </View>
                                    <View style={style.inputContainer}>
                                        <TextInputWithLocalizedPlaceholder
                                            ref={this.channelNameRef}
                                            value={displayName}
                                            onChangeText={this.onDisplayNameChangeText}
                                            style={style.input}
                                            autoCapitalize='none'
                                            autoCorrect={false}
                                            placeholder={{id: 'channel_modal.nameEx', defaultMessage: 'E.g.: "Bugs", "Marketing", "客户支持"'}}
                                            placeholderTextColor={changeOpacity('#000', 0.5)}
                                            underlineColorAndroid='transparent'
                                            disableFullscreenUI={true}
                                        />
                                    </View>
                                </View>
                            )}
                            {/*TODO: Hide channel url field until it's added to CreateChannel */}
                            {false && editing && !displayHeaderOnly && (
                                <View>
                                    <View style={style.titleContainer30}>
                                        <FormattedText
                                            style={style.title}
                                            id='rename_channel.url'
                                            defaultMessage='URL'
                                        />
                                        <Text style={style.optional}>
                                            {shortUrl}
                                        </Text>
                                    </View>
                                    <View style={style.inputContainer}>
                                        <TextInputWithLocalizedPlaceholder
                                            ref={this.channelURLRef}
                                            value={channelURL}
                                            onChangeText={this.onDisplayURLChangeText}
                                            style={style.input}
                                            autoCapitalize='none'
                                            autoCorrect={false}
                                            placeholder={{id: 'rename_channel.handleHolder', defaultMessage: 'lowercase alphanumeric characters'}}
                                            placeholderTextColor={changeOpacity('#000', 0.5)}
                                            underlineColorAndroid='transparent'
                                            disableFullscreenUI={true}
                                        />
                                    </View>
                                </View>
                            )}
                            {!displayHeaderOnly && (
                                <View>
                                    <View style={style.titleContainer30}>
                                        <FormattedText
                                            style={style.title}
                                            id='channel_modal.purpose'
                                            defaultMessage='Purpose'
                                        />
                                        <FormattedText
                                            style={style.optional}
                                            id='channel_modal.optional'
                                            defaultMessage='(optional)'
                                        />
                                    </View>
                                    <View style={style.inputContainer}>
                                        <TextInputWithLocalizedPlaceholder
                                            ref={this.channelPurposeRef}
                                            value={purpose}
                                            onChangeText={this.onPurposeChangeText}
                                            style={[style.input, {height: 110}]}
                                            autoCapitalize='none'
                                            autoCorrect={false}
                                            placeholder={{id: 'channel_modal.purposeEx', defaultMessage: 'E.g.: "A channel to file bugs and improvements"'}}
                                            placeholderTextColor={changeOpacity('#000', 0.5)}
                                            multiline={true}
                                            blurOnSubmit={false}
                                            textAlignVertical='top'
                                            underlineColorAndroid='transparent'
                                            disableFullscreenUI={true}
                                        />
                                    </View>
                                    <View>
                                        <FormattedText
                                            style={style.helpText}
                                            id='channel_modal.descriptionHelp'
                                            defaultMessage='Describe how this channel should be used.'
                                        />
                                    </View>
                                </View>
                            )}
                            <View style={style.titleContainer15}>
                                <FormattedText
                                    style={style.title}
                                    id='channel_modal.header'
                                    defaultMessage='Header'
                                />
                                <FormattedText
                                    style={style.optional}
                                    id='channel_modal.optional'
                                    defaultMessage='(optional)'
                                />
                            </View>
                            <View style={style.inputContainer}>
                                <TextInputWithLocalizedPlaceholder
                                    ref={this.channelHeaderRef}
                                    value={header}
                                    onChangeText={this.onHeaderChangeText}
                                    style={[style.input, {height: 110}]}
                                    autoCapitalize='none'
                                    autoCorrect={false}
                                    placeholder={{id: 'channel_modal.headerEx', defaultMessage: 'E.g.: "[Link Title](http://example.com)"'}}
                                    placeholderTextColor={changeOpacity('#000', 0.5)}
                                    multiline={true}
                                    blurOnSubmit={false}
                                    onFocus={this.scrollToEnd}
                                    textAlignVertical='top'
                                    underlineColorAndroid='transparent'
                                    disableFullscreenUI={true}
                                />
                            </View>
                            <View ref={this.lastTextRef}>
                                <FormattedText
                                    style={style.helpText}
                                    id='channel_modal.headerHelp'
                                    defaultMessage={'Set text that will appear in the header of the channel beside the channel name. For example, include frequently used links by typing [Link Title](http://example.com).'}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAwareScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 10,
        },
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        inputContainer: {
            marginTop: 10,
            backgroundColor: '#fff',
        },
        input: {
            color: '#333',
            fontSize: 14,
            height: 40,
            paddingHorizontal: 15,
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
    };
});

