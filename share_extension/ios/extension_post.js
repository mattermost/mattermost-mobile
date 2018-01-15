// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Dimensions,
    Image,
    NativeModules,
    ScrollView,
    Text,
    TextInput,
    TouchableHighlight,
    View
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import LocalAuth from 'react-native-local-auth';

import {Client4} from 'mattermost-redux/client';
import {lookupMimeType} from 'mattermost-redux/utils/file_utils';

import mattermostBucket from 'app/mattermost_bucket';
import {generateId} from 'app/utils/file';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import Config from 'assets/config';

import ExcelSvg from 'share_extension/icons/excel';
import GenericSvg from 'share_extension/icons/generic';
import PdfSvg from 'share_extension/icons/pdf';
import PptSvg from 'share_extension/icons/ppt';
import ZipSvg from 'share_extension/icons/zip';

import ExtensionChannels from './extension_channels';
import ExtensionNavBar from './extension_nav_bar';
import ExtensionTeams from './extension_teams';

const ShareExtension = NativeModules.MattermostShare;
const MAX_INPUT_HEIGHT = 95;
const MAX_MESSAGE_LENGTH = 4000;

const extensionSvg = {
    csv: ExcelSvg,
    pdf: PdfSvg,
    ppt: PptSvg,
    pptx: PptSvg,
    xls: ExcelSvg,
    xlsx: ExcelSvg,
    zip: ZipSvg
};

export default class ExtensionPost extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        onClose: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    static contextTypes = {
        intl: intlShape
    };

    constructor(props, context) {
        super(props, context);

        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;

        this.state = {
            currentUserId: null,
            error: null,
            files: [],
            isLandscape,
            value: ''
        };
    }

    componentWillMount() {
        this.loadData();
    }

    componentDidMount() {
        this.focusInput();
    }

    componentDidUpdate() {
        this.focusInput();
    }

    auth = async () => {
        try {
            const emmSecured = await mattermostBucket.get('emm', Config.AppGroupId);
            if (emmSecured) {
                const {intl} = this.context;
                await LocalAuth.authenticate({
                    reason: intl.formatMessage({
                        id: 'mobile.managed.secured_by',
                        defaultMessage: 'Secured by {vendor}'
                    }, {emmSecured}),
                    fallbackToPasscode: true,
                    suppressEnterPassword: true
                });
            }
        } catch (error) {
            this.props.onClose();
        }
    };

    focusInput = () => {
        if (this.input && !this.input.isFocused()) {
            this.input.focus();
        }
    };

    getInputRef = (ref) => {
        this.input = ref;
    };

    getScrollViewRef = (ref) => {
        this.scrollView = ref;
    };

    goToChannels = wrapWithPreventDoubleTap(() => {
        const {navigator, theme} = this.props;
        const {channel, currentUserId, team} = this.state;

        navigator.push({
            component: ExtensionChannels,
            wrapperStyle: {
                borderRadius: 10,
                backgroundColor: theme.centerChannelBg
            },
            passProps: {
                currentChannelId: channel.id,
                currentUserId,
                onSelectChannel: this.selectChannel,
                teamId: team.id,
                theme,
                title: team.display_name
            }
        });
    });

    goToTeams = wrapWithPreventDoubleTap(() => {
        const {navigator, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const {team} = this.state;

        navigator.push({
            component: ExtensionTeams,
            title: formatMessage({id: 'quick_switch_modal.teams', defaultMessage: 'Teams'}),
            wrapperStyle: {
                borderRadius: 10,
                backgroundColor: theme.centerChannelBg
            },
            passProps: {
                currentTeamId: team.id,
                onSelectTeam: this.selectTeam,
                theme
            }
        });
    });

    handleCancel = wrapWithPreventDoubleTap(() => {
        this.props.onClose();
    });

    handleTextChange = (value) => {
        this.setState({value});
    };

    loadData = async () => {
        const {credentials} = this.props;
        if (credentials) {
            try {
                const currentUserId = await mattermostBucket.get('currentUserId', Config.AppGroupId);
                const channel = await mattermostBucket.get('selectedChannel', Config.AppGroupId);
                const team = await mattermostBucket.get('selectedTeam', Config.AppGroupId);
                const items = await ShareExtension.data(Config.AppGroupId);
                const text = [];
                const urls = [];
                const files = [];

                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    switch (item.type) {
                    case 'public.plain-text':
                        text.push(item.value);
                        break;
                    case 'public.url':
                        urls.push(item.value);
                        break;
                    default: {
                        const fullPath = item.value;
                        const filePath = fullPath.replace('file://', '');
                        const filename = fullPath.replace(/^.*[\\/]/, '');
                        const extension = filename.split('.').pop();
                        files.push({
                            extension,
                            filename,
                            filePath,
                            fullPath,
                            mimeType: lookupMimeType(filename.toLowerCase()),
                            type: item.type
                        });
                        break;
                    }
                    }
                }

                let value = text.join('\n');
                if (urls.length) {
                    value += text.length ? `\n${urls.join('\n')}` : urls.join('\n');
                }

                Client4.setUrl(credentials.url);
                Client4.setToken(credentials.token);
                this.setState({channel, currentUserId, files, team, value});
            } catch (error) {
                this.setState({error});
            }
        }
    };

    onLayout = async () => {
        const isLandscape = await ShareExtension.getOrientation() === 'LANDSCAPE';

        if (this.state.isLandscape !== isLandscape) {
            if (this.scrollView) {
                setTimeout(() => {
                    this.scrollView.scrollTo({y: 0, animated: false});
                }, 250);
            }
            this.setState({isLandscape});
        }
    };

    renderBody = (styles) => {
        const {formatMessage} = this.context.intl;
        const {credentials, theme} = this.props;
        const {error, value} = this.state;

        if (credentials && !error) {
            return (
                <ScrollView
                    ref={this.getScrollViewRef}
                    contentContainerStyle={styles.scrollView}
                    style={styles.flex}
                >
                    <TextInput
                        ref={this.getInputRef}
                        maxLength={MAX_MESSAGE_LENGTH}
                        multiline={true}
                        onChangeText={this.handleTextChange}
                        placeholder={formatMessage({id: 'create_post.write', defaultMessage: 'Write a message...'})}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        style={[styles.input, {maxHeight: MAX_INPUT_HEIGHT}]}
                        value={value}
                    />
                    {this.renderFiles(styles)}
                </ScrollView>
            );
        }

        if (error) {
            return (
                <View style={styles.unauthenticatedContainer}>
                    <Text style={styles.unauthenticated}>
                        {error.message}
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.unauthenticatedContainer}>
                <Text style={styles.unauthenticated}>
                    {'Authentication required: Please first login using the app.'}
                </Text>
            </View>
        );
    };

    renderChannelButton = (styles) => {
        const {formatMessage} = this.context.intl;
        const {credentials, theme} = this.props;
        const {channel} = this.state;
        const channelName = channel ? channel.display_name : '';

        if (!credentials) {
            return null;
        }

        return (
            <TouchableHighlight
                onPress={this.goToChannels}
                style={styles.buttonContainer}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.2)}
            >
                <View style={styles.buttonWrapper}>
                    <View style={styles.buttonLabelContainer}>
                        <Text style={styles.buttonLabel}>
                            {formatMessage({id: 'mobile.share_extension.channel', defaultMessage: 'Channel'})}
                        </Text>
                    </View>
                    <View style={styles.buttonValueContainer}>
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={styles.buttonValue}
                        >
                            {channelName}
                        </Text>
                        <View style={styles.arrowContainer}>
                            <IonIcon
                                color={changeOpacity(theme.centerChannelColor, 0.4)}
                                name='ios-arrow-forward'
                                size={25}
                            />
                        </View>
                    </View>
                </View>
            </TouchableHighlight>
        );
    };

    renderFiles = (styles) => {
        const {files} = this.state;

        return files.map((file, index) => {
            let component;

            switch (file.type) {
            case 'public.image':
                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.imageContainer}
                    >
                        <Image
                            source={{uri: file.fullPath}}
                            resizeMode='cover'
                            style={styles.image}
                        />
                    </View>
                );
                break;
            case 'public.movie':
                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.imageContainer}
                    >
                        <Video
                            style={styles.video}
                            resizeMode='cover'
                            source={{uri: file.fullPath}}
                            volume={0}
                            paused={true}
                        />
                    </View>
                );
                break;
            case 'public.file-url': {
                let SvgIcon = extensionSvg[file.extension];
                if (!SvgIcon) {
                    SvgIcon = GenericSvg;
                }

                component = (
                    <View
                        key={`item-${index}`}
                        style={styles.otherContainer}
                    >
                        <View style={styles.otherWrapper}>
                            <View style={styles.fileIcon}>
                                <SvgIcon
                                    width={19}
                                    height={48}
                                />
                            </View>
                        </View>
                    </View>
                );
                break;
            }
            }

            return (
                <View
                    style={styles.fileContainer}
                    key={`item-${index}`}
                >
                    {component}
                    <Text
                        ellipsisMode='tail'
                        numberOfLines={1}
                        style={styles.filename}
                    >
                        {file.filename}
                    </Text>
                </View>
            );
        });
    };

    renderTeamButton = (styles) => {
        const {formatMessage} = this.context.intl;
        const {credentials, theme} = this.props;
        const {team} = this.state;
        const teamName = team ? team.display_name : '';

        if (!credentials) {
            return null;
        }

        return (
            <TouchableHighlight
                onPress={this.goToTeams}
                style={styles.buttonContainer}
                underlayColor={changeOpacity(theme.centerChannelColor, 0.2)}
            >
                <View style={styles.buttonWrapper}>
                    <View style={styles.flex}>
                        <Text style={styles.buttonLabel}>
                            {formatMessage({id: 'mobile.share_extension.team', defaultMessage: 'Team'})}
                        </Text>
                    </View>
                    <View style={styles.buttonValueContainer}>
                        <Text style={styles.buttonValue}>
                            {teamName}
                        </Text>
                        <View style={styles.arrowContainer}>
                            <IonIcon
                                color={changeOpacity(theme.centerChannelColor, 0.4)}
                                name='ios-arrow-forward'
                                size={25}
                            />
                        </View>
                    </View>
                </View>
            </TouchableHighlight>
        );
    };

    selectChannel = (channel) => {
        this.setState({channel});
    };

    selectTeam = (team, channel) => {
        this.setState({channel, team});
    };

    sendMessage = wrapWithPreventDoubleTap(async () => {
        const {credentials, onClose} = this.props;
        const {channel, currentUserId, files, value} = this.state;

        // If no text and no files do nothing
        if (!value && !files.length) {
            return;
        }

        if (currentUserId && credentials) {
            await this.auth();

            try {
                const post = {
                    user_id: currentUserId,
                    channel_id: channel.id,
                    message: value
                };

                const data = {
                    files,
                    post,
                    requestId: generateId()
                };

                onClose(data);
            } catch (error) {
                this.setState({error});
                setTimeout(() => {
                    onClose();
                }, 5000);
            }
        }
    });

    render() {
        const {credentials, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const styles = getStyleSheet(theme);

        return (
            <View
                onLayout={this.onLayout}
                style={styles.container}
            >
                <ExtensionNavBar
                    authenticated={Boolean(credentials)}
                    leftButtonTitle={formatMessage({id: 'mobile.share_extension.cancel', defaultMessage: 'Cancel'})}
                    onLeftButtonPress={this.handleCancel}
                    onRightButtonPress={this.sendMessage}
                    rightButtonTitle={formatMessage({id: 'mobile.share_extension.send', defaultMessage: 'Send'})}
                    theme={theme}
                />
                {this.renderBody(styles)}
                {this.renderTeamButton(styles)}
                {this.renderChannelButton(styles)}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1
        },
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05)
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 17,
            marginBottom: 5,
            width: '100%'
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginVertical: 5,
            width: '100%'
        },
        scrollView: {
            paddingHorizontal: 15
        },
        buttonContainer: {
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            height: 45,
            paddingHorizontal: 15
        },
        buttonWrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row'
        },
        buttonLabelContainer: {
            flex: 1
        },
        buttonLabel: {
            fontSize: 17,
            lineHeight: 45
        },
        buttonValueContainer: {
            justifyContent: 'flex-end',
            flex: 1,
            flexDirection: 'row'
        },
        buttonValue: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            alignSelf: 'flex-end',
            fontSize: 17,
            lineHeight: 45
        },
        arrowContainer: {
            height: 45,
            justifyContent: 'center',
            marginLeft: 15,
            top: 2
        },
        unauthenticatedContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15
        },
        unauthenticated: {
            color: theme.errorTextColor,
            fontSize: 14
        },
        fileContainer: {
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 4,
            borderWidth: 1,
            flexDirection: 'row',
            height: 48,
            marginBottom: 10,
            width: '100%'
        },
        filename: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            flex: 1
        },
        otherContainer: {
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            paddingVertical: 10,
            width: 38
        },
        otherWrapper: {
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1
        },
        fileIcon: {
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1
        },
        imageContainer: {
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            width: 38
        },
        image: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38
        },
        video: {
            backgroundColor: theme.centerChannelBg,
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38
        }
    };
});
