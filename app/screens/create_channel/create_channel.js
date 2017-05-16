// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PropTypes, PureComponent} from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {
    Dimensions,
    Keyboard,
    InteractionManager,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableWithoutFeedback,
    View,
    findNodeHandle
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {General, RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import Loading from 'app/components/loading';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

class CreateChannel extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        createChannelRequest: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        channelType: PropTypes.string,
        closeButton: PropTypes.object,
        actions: PropTypes.shape({
            handleCreateChannel: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        channelType: General.OPEN_CHANNEL
    };

    leftButton = {
        id: 'close-new-channel'
    };

    rightButton = {
        id: 'create-channel',
        disabled: true,
        showAsAction: 'never'
    };

    constructor(props) {
        super(props);

        this.state = {
            displayName: '',
            header: '',
            purpose: ''
        };
        this.rightButton.title = props.intl.formatMessage({id: 'mobile.create_channel', defaultMessage: 'Create'});

        if (props.channelType === General.PRIVATE_CHANNEL) {
            this.left = {...this.leftButton, icon: props.closeButton};
        }

        const buttons = {
            rightButtons: [this.rightButton]
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
        props.navigator.setButtons(buttons);
    }

    componentDidMount() {
        this.emitCanCreateChannel(false);
    }

    componentWillReceiveProps(nextProps) {
        const {createChannelRequest} = nextProps;

        if (this.props.createChannelRequest !== createChannelRequest) {
            switch (createChannelRequest.status) {
            case RequestStatus.STARTED:
                this.emitCreating(true);
                this.setState({error: null, creating: true});
                break;
            case RequestStatus.SUCCESS:
                EventEmitter.emit('close_channel_drawer');
                InteractionManager.runAfterInteractions(() => {
                    this.emitCreating(false);
                    this.setState({error: null, creating: false});
                    this.close(false);
                });
                break;
            case RequestStatus.FAILURE:
                this.emitCreating(false);
                this.setState({error: createChannelRequest.error, creating: false});
                break;
            }
        }
    }

    blur = () => {
        this.nameInput.refs.wrappedInstance.blur();
        this.purposeInput.refs.wrappedInstance.blur();
        this.headerInput.refs.wrappedInstance.blur();
        this.scroll.scrollToPosition(0, 0, true);
    };

    channelNameRef = (ref) => {
        this.nameInput = ref;
    };

    channelPurposeRef = (ref) => {
        this.purposeInput = ref;
    };

    channelHeaderRef = (ref) => {
        this.headerInput = ref;
    };

    close = (goBack = false) => {
        if (goBack) {
            this.props.navigator.pop({animated: true});
        } else {
            this.props.navigator.dismissAllModals({
                animationType: 'slide-down'
            });
        }
    };

    emitCanCreateChannel = (enabled) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: !enabled}]
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        this.props.navigator.setButtons(buttons);
    };

    emitCreating = (loading) => {
        const buttons = {
            rightButtons: [{...this.rightButton, disabled: loading}]
        };

        if (this.left) {
            buttons.leftButtons = [this.left];
        }

        this.props.navigator.setButtons(buttons);
    };

    lastTextRef = (ref) => {
        this.lastText = ref;
    };

    onCreateChannel = () => {
        Keyboard.dismiss();
        const {displayName, purpose, header} = this.state;
        this.props.actions.handleCreateChannel(displayName, purpose, header, this.props.channelType);
    };

    onDisplayNameChangeText = (displayName) => {
        this.setState({displayName});
        if (displayName && displayName.length >= 2) {
            this.emitCanCreateChannel(true);
        } else {
            this.emitCanCreateChannel(false);
        }
    };

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            switch (event.id) {
            case 'close-new-channel':
                this.close(this.props.channelType === General.OPEN_CHANNEL);
                break;
            case 'create-channel':
                this.onCreateChannel();
                break;
            }
        }
    };

    onPurposeChangeText = (purpose) => {
        this.setState({purpose});
    };

    onHeaderChangeText = (header) => {
        this.setState({header});
    };

    scrollRef = (ref) => {
        this.scroll = ref;
    };

    scrollToEnd = () => {
        this.scroll.scrollToFocusedInput(findNodeHandle(this.lastText));
    };

    render() {
        const {theme} = this.props;
        const {creating, displayName, header, purpose, error} = this.state;
        const {height, width} = Dimensions.get('window');

        const style = getStyleSheet(theme);

        if (creating) {
            return (
                <View style={{flex: 1}}>
                    <StatusBar barStyle='light-content'/>
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
                <StatusBar barStyle='light-content'/>
                <KeyboardAwareScrollView
                    ref={this.scrollRef}
                    style={style.container}
                >
                    <TouchableWithoutFeedback onPress={this.blur}>
                        <View style={[style.scrollView, {height: height + (Platform.OS === 'android' ? 200 : 0)}]}>
                            {displayError}
                            <View>
                                <FormattedText
                                    style={[style.title, {marginTop: (error ? 10 : 0)}]}
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
    return StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        scrollView: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
            paddingTop: 30
        },
        errorContainer: {
            position: 'absolute'
        },
        errorWrapper: {
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 10
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
    });
});

export default injectIntl(CreateChannel);
