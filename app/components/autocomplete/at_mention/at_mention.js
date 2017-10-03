// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    SectionList,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import AtMentionItem from 'app/components/autocomplete/at_mention_item';
import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';

const AT_MENTION_REGEX = /\B(@([^@\r\n\s]*))$/i;
const FROM_REGEX = /\bfrom:\s*(\S*)$/i;

export default class AtMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            autocompleteUsers: PropTypes.func.isRequired
        }).isRequired,
        autocompleteUsers: PropTypes.object.isRequired,
        currentChannelId: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        defaultChannel: PropTypes.object,
        hasMatch: PropTypes.bool,
        isSearch: PropTypes.bool,
        matchTerm: PropTypes.string,
        onChangeText: PropTypes.func.isRequired,
        postDraft: PropTypes.string,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        defaultChannel: {},
        postDraft: '',
        isSearch: false
    };

    constructor(props) {
        super(props);

        this.state = {
            sections: []
        };
    }

    componentWillReceiveProps(nextProps) {
        const {autocompleteUsers, hasMatch, isSearch, matchTerm, requestStatus} = nextProps;

        if (!hasMatch || this.state.mentionComplete) {
            this.setState({
                mentionComplete: false,
                sections: []
            });
            return;
        }

        if (matchTerm !== this.props.matchTerm && requestStatus !== RequestStatus.STARTED) {
            const {currentTeamId, currentChannelId} = this.props;
            this.props.actions.autocompleteUsers(matchTerm, currentTeamId, currentChannelId);
        }

        if (requestStatus === RequestStatus.NOT_STARTED || requestStatus === RequestStatus.SUCCESS) {
            const sections = [];
            if (isSearch) {
                const {teamMembers} = autocompleteUsers;
                sections.push({
                    id: 'mobile.suggestion.members',
                    defaultMessage: 'Members',
                    data: teamMembers,
                    key: 'teamMembers'
                });
            } else {
                const {inChannel, outChannel} = autocompleteUsers;
                if (inChannel.length > 0) {
                    sections.push({
                        id: 'suggestion.mention.members',
                        defaultMessage: 'Channel Members',
                        data: inChannel,
                        key: 'inChannel'
                    });
                }
                if (this.checkSpecialMentions(matchTerm) && !isSearch) {
                    sections.push({
                        id: 'suggestion.mention.special',
                        defaultMessage: 'Special Mentions',
                        data: this.getSpecialMentions(),
                        key: 'special',
                        renderItem: this.renderSpecialMentions
                    });
                }
                if (outChannel.length > 0) {
                    sections.push({
                        id: 'suggestion.mention.nonmembers',
                        defaultMessage: 'Not in Channel',
                        data: outChannel,
                        key: 'outChannel'
                    });
                }
            }

            this.setState({
                sections
            });
        }
    }

    keyExtractor = (item) => {
        return item.id || item;
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

        onChangeText(completedDraft, true);
        this.setState({mentionComplete: true});
    };

    renderSectionHeader = ({section}) => {
        return (
            <AutocompleteSectionHeader
                id={section.id}
                defaultMessage={section.defaultMessage}
                theme={this.props.theme}
            />
        );
    };

    renderItem = ({item}) => {
        return (
            <AtMentionItem
                onPress={this.completeMention}
                userId={item}
            />
        );
    };

    renderSpecialMentions = ({item}) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={this.completeMention.bind(this, item.completeHandle)}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <Icon
                        name='users'
                        style={style.rowIcon}
                    />
                </View>
                <Text style={style.textWrapper}>
                    <Text style={style.rowUsername}>{`@${item.completeHandle}`}</Text>
                    <Text style={style.rowUsername}>{' - '}</Text>
                    <FormattedText
                        id={item.id}
                        defaultMessage={item.defaultMessage}
                        values={item.values}
                        style={style.rowFullname}
                    />
                </Text>
            </TouchableOpacity>
        );
    };

    render() {
        const {isSearch, theme} = this.props;
        const {mentionComplete, sections} = this.state;

        if (sections.length === 0 || mentionComplete) {
            // If we are not in an active state or the mention has been completed return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(theme);

        return (
            <SectionList
                keyboardShouldPersistTaps='always'
                keyExtractor={this.keyExtractor}
                style={[style.listView, isSearch ? style.search : null]}
                sections={sections}
                renderItem={this.renderItem}
                renderSectionHeader={this.renderSectionHeader}
                initialNumToRender={10}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg
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
            flex: 1,
            opacity: 0.6
        },
        textWrapper: {
            flex: 1,
            flexWrap: 'wrap',
            paddingRight: 8
        },
        search: {
            height: 250
        }
    };
});
