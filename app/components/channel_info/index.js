// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    Platform,
    TouchableWithoutFeedback,
    View,
    Text,
    findNodeHandle
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {getShortenedURL} from 'app/utils/url';

class ChannelInfo extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        displayHeaderOnly: PropTypes.bool,
        creating: PropTypes.bool,
        editing: PropTypes.bool,
        updating: PropTypes.bool,
        error: PropTypes.string,
        displayName: PropTypes.string,
        currentTeamUrl: PropTypes.string,
        channelURL: PropTypes.string,
        purpose: PropTypes.string,
        header: PropTypes.string,
        enableRightButton: PropTypes.func,
        onDisplayNameChange: PropTypes.func,
        onChannelURLChange: PropTypes.func,
        onPurposeChange: PropTypes.func,
        onHeaderChange: PropTypes.func,
        oldChannel: PropTypes.shape({
            displayName: PropTypes.string,
            currentTeamUrl: PropTypes.string,
            channelURL: PropTypes.string,
            purpose: PropTypes.string,
            header: PropTypes.string
        }),
        actions: PropTypes.shape({
            handleCreateChannel: PropTypes.func,
            patchChannel: PropTypes.func
        })
    };

    static defaultProps = {
        editing: false
    };

    blur = () => {
        this.nameInput.refs.wrappedInstance.blur();
        this.urlInput.refs.wrappedInstance.blur();
        this.purposeInput.refs.wrappedInstance.blur();
        this.headerInput.refs.wrappedInstance.blur();
        this.scroll.scrollToPosition(0, 0, true);
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
                animationType: 'slide-down'
            });
        }
    };

    lastTextRef = (ref) => {
        this.lastText = ref;
    };

    canUpdate = (displayName, channelURL, purpose, header) => {
        const {
            oldChannel: {
                displayName: oldDisplayName,
                channelURL: oldChannelURL,
                purpose: oldPurpose,
                header: oldHeader
            }
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
        if (!editing && displayName && displayName.length >= 2) {
            this.props.enableRightButton(true);
        } else {
            this.props.enableRightButton(false);
        }

        if (editing) {
            const {channelURL, purpose, header} = this.props;
            const canUpdate = this.canUpdate(displayName, channelURL, purpose, header);
            this.enableRightButton(canUpdate);
        }
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
        this.scroll.scrollToFocusedInput(findNodeHandle(this.lastText));
    };

    render() {
        const {theme, editing, displayHeaderOnly, currentTeamUrl} = this.props;
        const {displayName, channelURL, header, purpose} = this.props;
        const {error, creating, updating} = this.props;
        const {height, width} = Dimensions.get('window');
        const fullUrl = currentTeamUrl + '/channels';
        const shortUrl = getShortenedURL(fullUrl, 35);

        const style = getStyleSheet(theme);

        if (creating || updating) {
            return (
                <View style={{flex: 1}}>
                    <StatusBar/>
                    <Loading/>
                </View>
            );
        }

        let displayError;
        if (error) {
            displayError = (
                <View style={[style.errorContainer, {width}]}>
                    <View style={style.errorWrapper}>
                        <ErrorText error={error}/>
                    </View>
                </View>
            );
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar/>
                <KeyboardAwareScrollView
                    ref={this.scrollRef}
                    style={style.container}
                >
                    {displayError}
                    <TouchableWithoutFeedback onPress={this.blur}>
                        <View style={[style.scrollView, {height: height + (Platform.OS === 'android' ? 200 : 0)}]}>
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
                                        />
                                    </View>
                                </View>
                            )}
                            {editing && !displayHeaderOnly && (
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
                                            underlineColorAndroid='transparent'
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
                                    underlineColorAndroid='transparent'
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
            backgroundColor: theme.centerChannelBg
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 10
        },
        errorContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center'
        },
        inputContainer: {
            marginTop: 10,
            backgroundColor: '#fff'
        },
        input: {
            color: '#333',
            fontSize: 14,
            height: 40,
            paddingHorizontal: 15
        },
        titleContainer30: {
            flexDirection: 'row',
            marginTop: 30
        },
        titleContainer15: {
            flexDirection: 'row',
            marginTop: 15
        },
        title: {
            fontSize: 14,
            color: theme.centerChannelColor,
            marginLeft: 15
        },
        optional: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 14,
            marginLeft: 5
        },
        helpText: {
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            marginTop: 10,
            marginHorizontal: 15
        },
        navTitle: {
            ...Platform.select({
                android: {
                    fontSize: 18
                },
                ios: {
                    fontSize: 15,
                    fontWeight: 'bold'
                }
            })
        }
    };
});

export default injectIntl(ChannelInfo, {withRef: true});
