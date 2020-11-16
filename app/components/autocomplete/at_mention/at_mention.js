// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SectionList} from 'react-native';

import {RequestStatus} from '@mm-redux/constants';

import {AT_MENTION_REGEX, AT_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';
import AtMentionItem from 'app/components/autocomplete/at_mention_item';
import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import SpecialMentionItem from 'app/components/autocomplete/special_mention_item';
import GroupMentionItem from 'app/components/autocomplete/at_mention_group/at_mention_group';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

export default class AtMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            autocompleteUsers: PropTypes.func.isRequired,
        }).isRequired,
        currentChannelId: PropTypes.string,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number,
        defaultChannel: PropTypes.object,
        inChannel: PropTypes.array,
        isSearch: PropTypes.bool,
        matchTerm: PropTypes.string,
        maxListHeight: PropTypes.number,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        outChannel: PropTypes.array,
        requestStatus: PropTypes.string.isRequired,
        teamMembers: PropTypes.array,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        nestedScrollEnabled: PropTypes.bool,
        useChannelMentions: PropTypes.bool.isRequired,
        groups: PropTypes.array,
    };

    static defaultProps = {
        defaultChannel: {},
        isSearch: false,
        value: '',
        inChannel: [],
    };

    constructor(props) {
        super(props);

        this.state = {
            sections: [],
        };
    }

    componentWillReceiveProps(nextProps) {
        const {groups, inChannel, outChannel, teamMembers, isSearch, matchTerm, requestStatus} = nextProps;

        // Not invoked, render nothing.
        if (matchTerm === null) {
            this.setState({
                sections: [],
            });
            return;
        }

        if (matchTerm !== this.props.matchTerm) {
            const sections = this.buildSections(nextProps);
            this.setState({
                sections,
            });

            this.props.onResultCountChange(sections.reduce((total, section) => total + section.data.length, 0));

            // Update user autocomplete list with results of server request
            const {currentTeamId, currentChannelId} = this.props;
            const channelId = isSearch ? '' : currentChannelId;
            this.props.actions.autocompleteUsers(matchTerm, currentTeamId, channelId);
            return;
        }

        // Server request is complete
        if (
            groups !== this.props.groups ||
                (
                    requestStatus !== RequestStatus.STARTED &&
                    (inChannel !== this.props.inChannel || outChannel !== this.props.outChannel || teamMembers !== this.props.teamMembers)
                )
        ) {
            const sections = this.buildSections(nextProps);
            this.setState({
                sections,
            });

            this.props.onResultCountChange(sections.reduce((total, section) => total + section.data.length, 0));
        }
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.sections.length !== this.state.sections.length && this.state.sections.length === 0) {
            this.props.onResultCountChange(0);
        }
    }

    buildSections = (props) => {
        const {isSearch, inChannel, outChannel, teamMembers, matchTerm, groups} = props;
        const sections = [];

        if (isSearch) {
            sections.push({
                id: t('mobile.suggestion.members'),
                defaultMessage: 'Members',
                data: teamMembers,
                key: 'teamMembers',
            });
        } else {
            if (inChannel.length) {
                sections.push({
                    id: t('suggestion.mention.members'),
                    defaultMessage: 'Channel Members',
                    data: inChannel,
                    key: 'inChannel',
                });
            }

            if (groups.length) {
                sections.push({
                    id: t('suggestion.mention.groups'),
                    defaultMessage: 'Group Mentions',
                    data: groups,
                    key: 'groups',
                    renderItem: this.renderGroupMentions,
                });
            }

            if (this.props.useChannelMentions && this.checkSpecialMentions(matchTerm)) {
                sections.push({
                    id: t('suggestion.mention.special'),
                    defaultMessage: 'Special Mentions',
                    data: this.getSpecialMentions(),
                    key: 'special',
                    renderItem: this.renderSpecialMentions,
                });
            }

            if (outChannel.length) {
                sections.push({
                    id: t('suggestion.mention.nonmembers'),
                    defaultMessage: 'Not in Channel',
                    data: outChannel,
                    key: 'outChannel',
                });
            }
        }

        return sections;
    };

    keyExtractor = (item) => {
        return item.id || item;
    };

    getSpecialMentions = () => {
        return [{
            completeHandle: 'all',
            id: t('suggestion.mention.all'),
            defaultMessage: 'Notifies everyone in this channel',
            values: {
                townsquare: this.props.defaultChannel.display_name,
            },
        }, {
            completeHandle: 'channel',
            id: t('suggestion.mention.channel'),
            defaultMessage: 'Notifies everyone in this channel',
        }, {
            completeHandle: 'here',
            id: t('suggestion.mention.here'),
            defaultMessage: 'Notifies everyone online in this channel',
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

        onChangeText(completedDraft);
        this.setState({
            sections: [],
        });
    };

    renderSectionHeader = ({section}) => {
        const isFirstSection = section.id === this.state.sections[0].id;
        return (
            <AutocompleteSectionHeader
                id={section.id}
                defaultMessage={section.defaultMessage}
                theme={this.props.theme}
                isLandscape={this.props.isLandscape}
                isFirstSection={isFirstSection}
            />
        );
    };

    renderItem = ({item}) => {
        return (
            <AtMentionItem
                testID={`autocomplete.at_mention.item.${item}`}
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

    renderGroupMentions = ({item}) => {
        return (
            <GroupMentionItem
                key={`autocomplete-group-${item.name}`}
                completeHandle={item.name}
                onPress={this.completeMention}
                theme={this.props.theme}
            />
        );
    };

    render() {
        const {maxListHeight, theme, nestedScrollEnabled} = this.props;
        const {sections} = this.state;
        if (sections.length === 0) {
            // If we are not in an active state or the mention has been completed return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const style = getStyleFromTheme(theme);

        return (
            <SectionList
                testID='at_mention_suggestion.list'
                keyboardShouldPersistTaps='always'
                keyExtractor={this.keyExtractor}
                style={[style.listView, {maxHeight: maxListHeight}]}
                sections={sections}
                renderItem={this.renderItem}
                renderSectionHeader={this.renderSectionHeader}
                initialNumToRender={10}
                nestedScrollEnabled={nestedScrollEnabled}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            backgroundColor: theme.centerChannelBg,
            borderRadius: 4,
        },
    };
});
