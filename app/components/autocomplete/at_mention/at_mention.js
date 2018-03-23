// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SectionList} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';
import AtMentionItem from 'app/components/autocomplete/at_mention_item';
import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import SpecialMentionItem from 'app/components/autocomplete/special_mention_item';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AtMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            autocompleteUsers: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        defaultChannel: PropTypes.object,
        inChannel: PropTypes.array,
        isSearch: PropTypes.bool,
        listHeight: PropTypes.number,
        matchTerm: PropTypes.string,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        outChannel: PropTypes.array,
        requestStatus: PropTypes.string.isRequired,
        teamMembers: PropTypes.array,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
        defaultChannel: {},
        isSearch: false,
        value: '',
    };

    constructor(props) {
        super(props);

        this.state = {
            sections: [],
        };
    }

    componentWillReceiveProps(nextProps) {
        const {inChannel, outChannel, teamMembers, isSearch, matchTerm, requestStatus} = nextProps;
        if ((matchTerm !== this.props.matchTerm && matchTerm === null) || this.state.mentionComplete) {
            // if the term changes but is null or the mention has been completed we render this component as null
            this.setState({
                mentionComplete: false,
                sections: [],
            });

            this.props.onResultCountChange(0);

            return;
        } else if (matchTerm === null) {
            // if the terms did not change but is null then we don't need to do anything
            return;
        }

        if (matchTerm !== this.props.matchTerm) {
            // if the term changed and we haven't made the request do that first
            const {currentTeamId, currentChannelId} = this.props;
            const channelId = isSearch ? '' : currentChannelId;
            this.props.actions.autocompleteUsers(matchTerm, currentTeamId, channelId);
            return;
        }

        if (requestStatus !== RequestStatus.STARTED &&
            (inChannel !== this.props.inChannel || outChannel !== this.props.outChannel || teamMembers !== this.props.teamMembers)) {
            // if the request is complete and the term is not null we show the autocomplete
            const sections = [];
            if (isSearch) {
                sections.push({
                    id: 'mobile.suggestion.members',
                    defaultMessage: 'Members',
                    data: teamMembers,
                    key: 'teamMembers',
                });
            } else {
                if (inChannel.length) {
                    sections.push({
                        id: 'suggestion.mention.members',
                        defaultMessage: 'Channel Members',
                        data: inChannel,
                        key: 'inChannel',
                    });
                }

                if (this.checkSpecialMentions(matchTerm)) {
                    sections.push({
                        id: 'suggestion.mention.special',
                        defaultMessage: 'Special Mentions',
                        data: this.getSpecialMentions(),
                        key: 'special',
                        renderItem: this.renderSpecialMentions,
                    });
                }

                if (outChannel.length) {
                    sections.push({
                        id: 'suggestion.mention.nonmembers',
                        defaultMessage: 'Not in Channel',
                        data: outChannel,
                        key: 'outChannel',
                    });
                }
            }

            this.setState({
                sections,
            });

            this.props.onResultCountChange(sections.reduce((total, section) => total + section.data.length, 0));
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
                townsquare: this.props.defaultChannel.display_name,
            },
        }, {
            completeHandle: 'channel',
            id: 'suggestion.mention.channel',
            defaultMessage: 'Notifies everyone in the channel',
        }, {
            completeHandle: 'here',
            id: 'suggestion.mention.here',
            defaultMessage: 'Notifies everyone in the channel and online',
        }];
    };

    checkSpecialMentions = (term) => {
        return this.getSpecialMentions().filter((m) => m.completeHandle.startsWith(term)).length > 0;
    };

    completeMention = (mention) => {
        const {cursorPosition, isSearch, onChangeText, value} = this.props;
        const mentionPart = value.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            completedDraft = mentionPart.replace(AT_MENTION_SEARCH_REGEX, `from: ${mention} `);
        } else {
            completedDraft = mentionPart.replace(AT_MENTION_REGEX, `@${mention} `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
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
        return (
            <SpecialMentionItem
                completeHandle={item.completeHandle}
                defaultMessage={item.defaultMessage}
                id={item.id}
                onPress={this.completeMention}
                theme={this.props.theme}
                values={item.values}
            />
        );
    };

    render() {
        const {isSearch, listHeight, theme} = this.props;
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
                style={[style.listView, isSearch ? [style.search, {height: listHeight}] : null]}
                sections={sections}
                renderItem={this.renderItem}
                renderSectionHeader={this.renderSectionHeader}
                ItemSeparatorComponent={AutocompleteDivider}
                initialNumToRender={10}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
        },
        search: {
            minHeight: 125,
        },
    };
});
