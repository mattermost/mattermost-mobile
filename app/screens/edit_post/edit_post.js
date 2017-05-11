// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

import ActionButton from 'app/components/action_button';
import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import KeyboardLayout from 'app/components/layout/keyboard_layout';
import NavBar from 'app/components/nav_bar';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

export default class EditPost extends PureComponent {
    static propTypes = {
        editPostRequest: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        post: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            editPost: PropTypes.func.isRequired
        })
    };

    constructor(props) {
        super(props);
        this.state = {message: props.post.message};
    }

    onEditPost = async () => {
        const {message} = this.state;
        const post = Object.assign({}, this.props.post, {message});
        await this.props.actions.editPost(post);
    };

    onPostChangeText = (message) => {
        this.setState({message});
        if (message) {
            this.emitCanEditPost(true);
        } else {
            this.emitCanEditPost(false);
        }
    };

    emitCanEditPost = (enabled) => {
        EventEmitter.emit('can_edit_post', enabled);
    };

    emitEditing = (loading) => {
        EventEmitter.emit('editing_post', loading);
    };

    focus = () => {
        this.messageInput.refs.wrappedInstance.focus();
    };

    messageRef = (ref) => {
        this.messageInput = ref;
    };

    componentWillMount() {
        EventEmitter.on('edit_post', this.onEditPost);
    }

    componentWillReceiveProps(nextProps) {
        const {editPostRequest} = nextProps;

        if (this.props.editPostRequest !== editPostRequest) {
            switch (editPostRequest.status) {
            case RequestStatus.STARTED:
                this.emitEditing(true);
                this.setState({error: null});
                break;
            case RequestStatus.SUCCESS:
                this.emitEditing(false);
                this.setState({error: null});
                this.close();
                break;
            case RequestStatus.FAILURE:
                this.emitEditing(false);
                this.setState({error: editPostRequest.error});
                break;
            }
        }
    }

    componentDidMount() {
        this.focus();
    }

    componentWillUnmount() {
        EventEmitter.off('edit_post', this.onEditPost);
    }

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'slide-down'
        });
    };

    handleSubmit = () => {
        // Workaround for android as the multiline is not working
        if (Platform.OS === 'android') {
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            this.timeout = setTimeout(() => {
                let {message: msg} = this.state;
                msg += '\n';
                this.setState({message: msg});
            }, 100);
        }
    };

    render() {
        const {theme} = this.props;
        const {message, error} = this.state;
        const {height, width} = Dimensions.get('window');

        const style = getStyleSheet(theme);

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

        const navbarLeft = (
            <TouchableOpacity
                onPress={this.close}
            >
                <FormattedText
                    id='edit_post.cancel'
                    defaultMessage='Cancel'
                    style={{color: theme.sidebarHeaderTextColor}}
                />
            </TouchableOpacity>
        );

        const navbarTitle = (
            <FormattedText
                id='mobile.edit_post.title'
                defaultMessage='Editing Message'
                ellipsizeMode='tail'
                numberOfLines={1}
                style={{
                    color: theme.sidebarHeaderTextColor,
                    fontSize: 15,
                    fontWeight: 'bold'
                }}
            />
        );

        const navbarRight = (
            <ActionButton
                actionEventName='edit_post'
                enabled={true}
                enableEventName='can_edit_post'
                labelDefaultMessage='Save'
                labelId='edit_post.save'
                loadingEventName='editing_post'
            />
        );

        return (
            <KeyboardLayout
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle='light-content'/>
                <NavBar
                    left={navbarLeft}
                    title={navbarTitle}
                    right={navbarRight}
                />
                <View style={style.scrollView}>
                    {displayError}
                    <View style={[style.inputContainer, {height: Platform.OS === 'android' ? (height / 2) - 20 : (height / 2)}]}>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.messageRef}
                            value={message}
                            blurOnSubmit={false}
                            onChangeText={this.onPostChangeText}
                            multiline={true}
                            numberOfLines={10}
                            style={[style.input, {height: height / 2}]}
                            autoCapitalize='none'
                            autoCorrect={false}
                            placeholder={{id: 'edit_post.editPost', defaultMessage: 'Edit the post...'}}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.4)}
                            underlineColorAndroid='transparent'
                            onSubmitEditing={this.handleSubmit}
                        />
                    </View>
                </View>
            </KeyboardLayout>
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
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03)
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
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            backgroundColor: theme.centerChannelBg,
            marginTop: 2
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 14,
            padding: 15,
            textAlignVertical: 'top'
        }
    });
});
