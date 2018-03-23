// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    NativeModules,
    ScrollView,
    Text,
    TextInput,
    TouchableHighlight,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import LocalAuth from 'react-native-local-auth';
import RNFetchBlob from 'react-native-fetch-blob';

import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';
import {getFormattedFileSize, lookupMimeType} from 'mattermost-redux/utils/file_utils';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';

import mattermostBucket from 'app/mattermost_bucket';
import {generateId, getAllowedServerMaxFileSize} from 'app/utils/file';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import Config from 'assets/config';

import {
    ExcelSvg,
    GenericSvg,
    PdfSvg,
    PptSvg,
    ZipSvg,
} from 'share_extension/common/icons';

import ExtensionChannels from './extension_channels';
import ExtensionNavBar from './extension_nav_bar';
import ExtensionTeams from './extension_teams';

const ShareExtension = NativeModules.MattermostShare;
const MAX_INPUT_HEIGHT = 95;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const extensionSvg = {
    csv: ExcelSvg,
    pdf: PdfSvg,
    ppt: PptSvg,
    pptx: PptSvg,
    xls: ExcelSvg,
    xlsx: ExcelSvg,
    zip: ZipSvg,
};

export default class ExtensionPost extends PureComponent {
    static propTypes = {
        authenticated: PropTypes.bool.isRequired,
        entities: PropTypes.object,
        navigator: PropTypes.object.isRequired,
        onClose: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    constructor(props, context) {
        super(props, context);

        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;
        const entities = props.entities;

        this.useBackgroundUpload = props.authenticated ? isMinimumServerVersion(entities.general.serverVersion, 4, 8) : false;

        this.state = {
            entities,
            error: null,
            files: [],
            isLandscape,
            exceededSize: 0,
            value: '',
            sending: false,
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

    emmAuthenticationIfNeeded = async () => {
        try {
            const emmSecured = await mattermostBucket.getPreference('emm', Config.AppGroupId);
            if (emmSecured) {
                const {intl} = this.context;
                await LocalAuth.authenticate({
                    reason: intl.formatMessage({
                        id: 'mobile.managed.secured_by',
                        defaultMessage: 'Secured by {vendor}',
                    }, {emmSecured}),
                    fallbackToPasscode: true,
                    suppressEnterPassword: true,
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

    goToChannels = preventDoubleTap(() => {
        const {navigator, theme} = this.props;
        const {channel, entities, team} = this.state;

        navigator.push({
            component: ExtensionChannels,
            wrapperStyle: {
                borderRadius: 10,
                backgroundColor: theme.centerChannelBg,
            },
            passProps: {
                currentChannelId: channel.id,
                entities,
                onSelectChannel: this.selectChannel,
                teamId: team.id,
                theme,
                title: team.display_name,
            },
        });
    });

    goToTeams = preventDoubleTap(() => {
        const {navigator, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const {team} = this.state;

        navigator.push({
            component: ExtensionTeams,
            title: formatMessage({id: 'quick_switch_modal.teams', defaultMessage: 'Teams'}),
            wrapperStyle: {
                borderRadius: 10,
                backgroundColor: theme.centerChannelBg,
            },
            passProps: {
                entities: this.state.entities,
                currentTeamId: team.id,
                onSelectTeam: this.selectTeam,
                theme,
            },
        });
    });

    handleCancel = preventDoubleTap(() => {
        this.props.onClose();
    });

    handleTextChange = (value) => {
        this.setState({value});
    };

    loadData = async () => {
        const {entities} = this.state;

        if (this.props.authenticated) {
            try {
                const {config, credentials} = entities.general;
                const {currentUserId} = entities.users;
                const team = entities.teams.teams[entities.teams.currentTeamId];
                let channel = entities.channels.channels[entities.channels.currentChannelId];
                const items = await ShareExtension.data(Config.AppGroupId);
                const serverMaxFileSize = getAllowedServerMaxFileSize(config);
                const maxSize = Math.min(MAX_FILE_SIZE, serverMaxFileSize);
                const text = [];
                const urls = [];
                const files = [];
                let totalSize = 0;
                let exceededSize = false;

                if (channel.type === General.GM_CHANNEL || channel.type === General.DM_CHANNEL) {
                    channel = getChannel({entities}, channel.id);
                }

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
                        const fileSize = await RNFetchBlob.fs.stat(filePath);
                        const filename = fullPath.replace(/^.*[\\/]/, '');
                        const extension = filename.split('.').pop();

                        if (this.useBackgroundUpload) {
                            if (!exceededSize) {
                                exceededSize = fileSize.size >= maxSize;
                            }
                        } else {
                            totalSize += fileSize.size;
                        }
                        files.push({
                            extension,
                            filename,
                            filePath,
                            fullPath,
                            mimeType: lookupMimeType(filename.toLowerCase()),
                            size: getFormattedFileSize(fileSize),
                            type: item.type,
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
                Client4.setUserId(currentUserId);

                if (!this.useBackgroundUpload) {
                    exceededSize = totalSize >= maxSize;
                }

                this.setState({channel, files, team, value, exceededSize});
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
        const {authenticated, theme} = this.props;
        const {entities, error, sending, exceededSize, value} = this.state;
        const {config} = entities.general;
        const serverMaxFileSize = getAllowedServerMaxFileSize(config);
        const maxSize = Math.min(MAX_FILE_SIZE, serverMaxFileSize);

        if (sending) {
            return (
                <View style={styles.sendingContainer}>
                    <ActivityIndicator/>
                    <Text style={styles.sendingText}>
                        {formatMessage({
                            id: 'mobile.extension.posting',
                            defaultMessage: 'Posting...',
                        })}
                    </Text>
                </View>
            );
        }

        if (exceededSize) {
            return (
                <View style={styles.unauthenticatedContainer}>
                    <Text style={styles.unauthenticated}>
                        {formatMessage({
                            id: 'mobile.extension.max_file_size',
                            defaultMessage: 'File attachments shared in Mattermost must be less than {size}.',
                        }, {size: getFormattedFileSize({size: maxSize})})}
                    </Text>
                </View>
            );
        }

        if (authenticated && !error) {
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
                    {formatMessage({
                        id: 'mobile.extension.authentication_required',
                        defaultMessage: 'Authentication required: Please first login using the app.',
                    })}
                </Text>
            </View>
        );
    };

    renderChannelButton = (styles) => {
        const {formatMessage} = this.context.intl;
        const {authenticated, theme} = this.props;
        const {channel, sending} = this.state;
        const channelName = channel ? channel.display_name : '';

        if (sending) {
            return null;
        }

        if (!authenticated) {
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
                        {`${file.size} - ${file.filename}`}
                    </Text>
                </View>
            );
        });
    };

    renderTeamButton = (styles) => {
        const {formatMessage} = this.context.intl;
        const {authenticated, theme} = this.props;
        const {sending, team} = this.state;
        const teamName = team ? team.display_name : '';

        if (sending) {
            return null;
        }

        if (!authenticated) {
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
        this.setState({channel, team, error: null});

        // Update the channels for the team
        Client4.getMyChannels(team.id).then((channels) => {
            const defaultChannel = channels.find((c) => c.name === General.DEFAULT_CHANNEL && c.team_id === team.id);
            this.updateChannelsInEntities(channels);
            if (!channel) {
                this.setState({channel: defaultChannel});
            }
        }).catch((error) => {
            const {entities} = this.props;
            if (entities.channels.channelsInTeam[team.id]) {
                const townSquare = Object.values(entities.channels.channels).find((c) => {
                    return c.name === General.DEFAULT_CHANNEL && c.team_id === team.id;
                });

                if (!channel) {
                    this.setState({channel: townSquare});
                }
            } else {
                this.setState({error});
            }
        });
    };

    sendMessage = preventDoubleTap(async () => {
        const {authenticated, onClose} = this.props;
        const {channel, entities, files, value} = this.state;
        const {currentUserId} = entities.users;

        // If no text and no files do nothing
        if (!value && !files.length) {
            return;
        }

        if (currentUserId && authenticated) {
            await this.emmAuthenticationIfNeeded();

            try {
                // Check to see if the use still belongs to the channel
                await Client4.getMyChannelMember(channel.id);
                const post = {
                    user_id: currentUserId,
                    channel_id: channel.id,
                    message: value,
                };

                const data = {
                    files,
                    post,
                    requestId: generateId().replace(/-/g, ''),
                    useBackgroundUpload: this.useBackgroundUpload,
                };

                this.setState({sending: true});
                onClose(data);
            } catch (error) {
                this.setState({error});
                setTimeout(() => {
                    onClose();
                }, 5000);
            }
        }
    });

    updateChannelsInEntities = (newChannels) => {
        const {entities} = this.state;
        const newEntities = {
            ...entities,
            channels: {
                ...entities.channels,
                channels: {...entities.channels.channels},
                channelsInTeam: {...entities.channels.channelsInTeam},
            },
        };
        const {channels, channelsInTeam} = newEntities.channels;

        newChannels.forEach((c) => {
            channels[c.id] = c;
            const channelIdsInTeam = channelsInTeam[c.team_id];
            if (channelIdsInTeam) {
                if (!channelIdsInTeam.includes(c.id)) {
                    channelsInTeam[c.team_id].push(c.id);
                }
            } else {
                channelsInTeam[c.team_id] = [c.id];
            }
        });

        this.setState({entities: newEntities});
        mattermostBucket.writeToFile('entities', JSON.stringify(newEntities), Config.AppGroupId);
    };

    render() {
        const {authenticated, theme} = this.props;
        const {channel, totalSize, sending} = this.state;
        const {formatMessage} = this.context.intl;
        const styles = getStyleSheet(theme);

        let postButtonText = formatMessage({id: 'mobile.share_extension.send', defaultMessage: 'Send'});
        if (totalSize >= MAX_FILE_SIZE || sending || !channel) {
            postButtonText = null;
        }

        return (
            <View
                onLayout={this.onLayout}
                style={styles.container}
            >
                <ExtensionNavBar
                    authenticated={authenticated}
                    leftButtonTitle={sending ? null : formatMessage({id: 'mobile.share_extension.cancel', defaultMessage: 'Cancel'})}
                    onLeftButtonPress={this.handleCancel}
                    onRightButtonPress={this.sendMessage}
                    rightButtonTitle={postButtonText}
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
            flex: 1,
        },
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.05),
        },
        input: {
            color: theme.centerChannelColor,
            fontSize: 17,
            marginBottom: 5,
            width: '100%',
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginVertical: 5,
            width: '100%',
        },
        scrollView: {
            paddingHorizontal: 15,
        },
        buttonContainer: {
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 1,
            height: 45,
            paddingHorizontal: 15,
        },
        buttonWrapper: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
        },
        buttonLabelContainer: {
            flex: 1,
        },
        buttonLabel: {
            fontSize: 17,
            lineHeight: 45,
        },
        buttonValueContainer: {
            justifyContent: 'flex-end',
            flex: 1,
            flexDirection: 'row',
        },
        buttonValue: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            alignSelf: 'flex-end',
            fontSize: 17,
            lineHeight: 45,
        },
        arrowContainer: {
            height: 45,
            justifyContent: 'center',
            marginLeft: 15,
            top: 2,
        },
        unauthenticatedContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15,
        },
        unauthenticated: {
            color: theme.errorTextColor,
            fontSize: 14,
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
            width: '100%',
        },
        filename: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
            fontSize: 13,
            flex: 1,
        },
        otherContainer: {
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            paddingVertical: 10,
            width: 38,
        },
        otherWrapper: {
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2),
            flex: 1,
        },
        fileIcon: {
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
        },
        imageContainer: {
            borderBottomLeftRadius: 4,
            borderTopLeftRadius: 4,
            height: 48,
            marginRight: 10,
            width: 38,
        },
        image: {
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38,
        },
        video: {
            backgroundColor: theme.centerChannelBg,
            alignItems: 'center',
            height: 48,
            justifyContent: 'center',
            overflow: 'hidden',
            width: 38,
        },
        sendingContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: 15,
        },
        sendingText: {
            color: theme.centerChannelColor,
            fontSize: 16,
            paddingTop: 10,
        },
    };
});
