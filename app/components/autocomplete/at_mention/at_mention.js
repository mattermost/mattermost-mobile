// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    ListView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {sortByUsername} from 'mattermost-redux/utils/user_utils';

import FormattedText from 'app/components/formatted_text';
import ProfilePicture from 'app/components/profile_picture';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';

const AT_MENTION_REGEX = /\B(@([^@\r\n\s]*))$/i;
const FROM_REGEX = /\bfrom:\s*(\S*)$/i;

export default class AtMention extends Component {
    static propTypes = {
        currentUserId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        defaultChannel: PropTypes.object.isRequired,
        autocompleteUsers: PropTypes.object.isRequired,
        isSearch: PropTypes.bool,
        postDraft: PropTypes.string,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            autocompleteUsers: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        autocompleteUsers: {},
        defaultChannel: {},
        postDraft: '',
        isSearch: false
    };

    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2,
            rowHasChanged: (r1, r2) => r1 !== r2
        });
        const data = {};
        this.state = {
            active: false,
            dataSource: ds.cloneWithRowsAndSections(data)
        };
    }

    componentWillReceiveProps(nextProps) {
        const {isSearch} = nextProps;
        const regex = isSearch ? FROM_REGEX : AT_MENTION_REGEX;
        const match = nextProps.postDraft.substring(0, nextProps.cursorPosition).match(regex);

        if (!match || this.state.mentionComplete) {
            this.setState({
                active: false,
                matchTerm: null,
                mentionComplete: false
            });
            return;
        }

        const matchTerm = isSearch ? match[1] : match[2];
        if (matchTerm !== this.state.matchTerm) {
            this.setState({
                matchTerm
            });

            const {currentTeamId, currentChannelId} = this.props;
            this.props.actions.autocompleteUsers(matchTerm, currentTeamId, currentChannelId);
        }

        if (nextProps.requestStatus !== RequestStatus.STARTED) {
            const membersInChannel = this.filter(nextProps.autocompleteUsers.inChannel, matchTerm) || [];
            const membersOutOfChannel = this.filter(nextProps.autocompleteUsers.outChannel, matchTerm) || [];

            let data = {};
            if (isSearch) {
                data = {members: membersInChannel.concat(membersOutOfChannel).sort(sortByUsername)};
            } else {
                if (membersInChannel.length > 0) {
                    data = Object.assign({}, data, {inChannel: membersInChannel});
                }
                if (this.checkSpecialMentions(matchTerm) && !isSearch) {
                    data = Object.assign({}, data, {specialMentions: this.getSpecialMentions()});
                }
                if (membersOutOfChannel.length > 0) {
                    data = Object.assign({}, data, {notInChannel: membersOutOfChannel});
                }
            }

            this.setState({
                active: data.hasOwnProperty('inChannel') || data.hasOwnProperty('specialMentions') || data.hasOwnProperty('notInChannel') || data.hasOwnProperty('members'),
                dataSource: this.state.dataSource.cloneWithRowsAndSections(data)
            });
        }
    }

    filter = (profiles, matchTerm) => {
        const {isSearch} = this.props;
        return profiles.filter((p) => {
            return ((p.id !== this.props.currentUserId || isSearch) && (
                p.username.toLowerCase().includes(matchTerm) || p.email.toLowerCase().includes(matchTerm) ||
                p.first_name.toLowerCase().includes(matchTerm) || p.last_name.toLowerCase().includes(matchTerm)));
        });
    };

    getSpecialMentions = () => {
        return [{
            completeHandle: 'all',
            id: 'suggestion.mention.all',
            defaultMessage: 'Notifies everyone in the channel, use in {townsquare} to notify the whole team',
            values: {
                townsquare: this.props.defaultChannel.display_name
            }
        }, {
            completeHandle: 'channel',
            id: 'suggestion.mention.channel',
            defaultMessage: 'Notifies everyone in the channel'
        }, {
            completeHandle: 'here',
            id: 'suggestion.mention.here',
            defaultMessage: 'Notifies everyone in the channel and online'
        }];
    };

    checkSpecialMentions = (term) => {
        return this.getSpecialMentions().filter((m) => m.completeHandle.startsWith(term)).length > 0;
    };

    completeMention = (mention) => {
        const {cursorPosition, isSearch, onChangeText, postDraft} = this.props;
        const mentionPart = postDraft.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            completedDraft = mentionPart.replace(FROM_REGEX, `from: ${mention} `);
        } else {
            completedDraft = mentionPart.replace(AT_MENTION_REGEX, `@${mention} `);
        }

        if (postDraft.length > cursorPosition) {
            completedDraft += postDraft.substring(cursorPosition);
        }

        onChangeText(completedDraft);
        this.setState({
            active: false,
            mentionComplete: true
        });
    };

    renderSectionHeader = (sectionData, sectionId) => {
        const style = getStyleFromTheme(this.props.theme);

        const localization = {
            inChannel: {
                id: 'suggestion.mention.members',
                defaultMessage: 'Channel Members'
            },
            notInChannel: {
                id: 'suggestion.mention.nonmembers',
                defaultMessage: 'Not in Channel'
            },
            specialMentions: {
                id: 'suggestion.mention.special',
                defaultMessage: 'Special Mentions'
            },
            members: {
                id: 'mobile.suggestion.members',
                defaultMessage: 'Members'
            }
        };

        return (
            <View style={style.sectionWrapper}>
                <View style={style.section}>
                    <FormattedText
                        id={localization[sectionId].id}
                        defaultMessage={localization[sectionId].defaultMessage}
                        style={style.sectionText}
                    />
                </View>
            </View>
        );
    };

    renderRow = (data, sectionId) => {
        if (sectionId === 'specialMentions') {
            return this.renderSpecialMentions(data);
        }

        const style = getStyleFromTheme(this.props.theme);
        const hasFullName = data.first_name.length > 0 && data.last_name.length > 0;

        return (
            <TouchableOpacity
                onPress={() => this.completeMention(data.username)}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <ProfilePicture
                        user={data}
                        theme={this.props.theme}
                        size={20}
                        status={null}
                    />
                </View>
                <Text style={style.rowUsername}>{`@${data.username}`}</Text>
                {hasFullName && <Text style={style.rowUsername}>{' - '}</Text>}
                {hasFullName && <Text style={style.rowFullname}>{`${data.first_name} ${data.last_name}`}</Text>}
            </TouchableOpacity>
        );
    };

    renderSpecialMentions = (data) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={() => this.completeMention(data.completeHandle)}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <Icon
                        name='users'
                        style={style.rowIcon}
                    />
                </View>
                <Text style={style.textWrapper}>
                    <Text style={style.rowUsername}>{`@${data.completeHandle}`}</Text>
                    <Text style={style.rowUsername}>{' - '}</Text>
                    <FormattedText
                        id={data.id}
                        defaultMessage={data.defaultMessage}
                        values={data.values}
                        style={[style.rowFullname, {flex: 1}]}
                    />
                </Text>
            </TouchableOpacity>
        );
    };

    render() {
        const {autocompleteUsers, requestStatus} = this.props;
        if (!this.state.active && (requestStatus !== RequestStatus.STARTED || requestStatus !== RequestStatus.SUCCESS)) {
            // If we are not in an active state return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(this.props.theme);

        if (
            !autocompleteUsers.inChannel &&
            !autocompleteUsers.outChannel &&
            requestStatus === RequestStatus.STARTED
        ) {
            return (
                <View style={style.loading}>
                    <FormattedText
                        id='analytics.chart.loading'
                        defaultMessage='Loading...'
                        style={style.sectionText}
                    />
                </View>
            );
        }

        return (
            <ListView
                keyboardShouldPersistTaps='always'
                style={style.listView}
                enableEmptySections={true}
                dataSource={this.state.dataSource}
                renderSectionHeader={this.renderSectionHeader}
                renderRow={this.renderRow}
                renderFooter={this.renderFooter}
                pageSize={10}
                initialListSize={10}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        section: {
            justifyContent: 'center',
            paddingLeft: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        sectionText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            paddingVertical: 7
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg
        },
        loading: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 20,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 0
        },
        row: {
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 14
        },
        rowPicture: {
            marginHorizontal: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center'
        },
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        rowFullname: {
            color: theme.centerChannelColor,
            opacity: 0.6
        },
        textWrapper: {
            flex: 1,
            flexWrap: 'wrap',
            paddingRight: 8
        }
    });
});
