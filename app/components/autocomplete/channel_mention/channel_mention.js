// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SectionList} from 'react-native';

import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import ChannelMentionItem from 'app/components/autocomplete/channel_mention_item';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';

const CHANNEL_MENTION_REGEX = /\B(~([^~\r\n]*))$/i;
const CHANNEL_SEARCH_REGEX = /\b(?:in|channel):\s*(\S*)$/i;

export default class ChannelMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            searchChannels: PropTypes.func.isRequired
        }).isRequired,
        autocompleteChannels: PropTypes.object.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        hasMatch: PropTypes.bool,
        isSearch: PropTypes.bool,
        matchTerm: PropTypes.string,
        onChangeText: PropTypes.func.isRequired,
        postDraft: PropTypes.string,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
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
        const {autocompleteChannels, hasMatch, isSearch, matchTerm, requestStatus} = nextProps;

        if (!hasMatch || this.state.mentionComplete) {
            this.setState({
                mentionComplete: false,
                sections: []
            });
            return;
        }

        if (matchTerm !== this.props.matchTerm && requestStatus !== RequestStatus.STARTED) {
            const {currentTeamId} = this.props;
            this.props.actions.searchChannels(currentTeamId, matchTerm);
            return;
        }

        if (requestStatus === RequestStatus.NOT_STARTED || requestStatus === RequestStatus.SUCCESS) {
            const sections = [];
            if (isSearch) {
                const {publicChannels, privateChannels} = autocompleteChannels;
                if (publicChannels.length) {
                    sections.push({
                        id: 'suggestion.search.public',
                        defaultMessage: 'Public Channels',
                        data: publicChannels,
                        key: 'publicChannels'
                    });
                }

                if (privateChannels.length) {
                    sections.push({
                        id: 'suggestion.search.private',
                        defaultMessage: 'Private Channels',
                        data: privateChannels,
                        key: 'privateChannels'
                    });
                }
            } else {
                const {myChannels, otherChannels} = autocompleteChannels;
                if (myChannels.length > 0) {
                    sections.push({
                        id: 'suggestion.mention.channels',
                        defaultMessage: 'My Channels',
                        data: myChannels,
                        key: 'myChannels'
                    });
                }

                if (otherChannels.length > 0) {
                    sections.push({
                        id: 'suggestion.mention.morechannels',
                        defaultMessage: 'Other Channels',
                        data: otherChannels,
                        key: 'otherChannels'
                    });
                }
            }

            this.setState({
                sections
            });
        }
    }

    completeMention = (mention) => {
        const {cursorPosition, isSearch, onChangeText, postDraft} = this.props;
        const mentionPart = postDraft.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            const channelOrIn = mentionPart.includes('in:') ? 'in:' : 'channel:';
            completedDraft = mentionPart.replace(CHANNEL_SEARCH_REGEX, `${channelOrIn} ${mention} `);
        } else {
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~${mention} `);
        }

        if (postDraft.length > cursorPosition) {
            completedDraft += postDraft.substring(cursorPosition);
        }

        onChangeText(completedDraft, true);
        this.setState({mentionComplete: true});
    };

    keyExtractor = (item) => {
        return item.id || item;
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
            <ChannelMentionItem
                channelId={item}
                onPress={this.completeMention}
            />
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
        search: {
            height: 250
        }
    };
});
