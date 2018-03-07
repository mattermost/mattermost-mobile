// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {SectionList} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';

import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';
import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import ChannelMentionItem from 'app/components/autocomplete/channel_mention_item';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            searchChannels: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        isSearch: PropTypes.bool,
        listHeight: PropTypes.number,
        matchTerm: PropTypes.string,
        myChannels: PropTypes.array,
        otherChannels: PropTypes.array,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        privateChannels: PropTypes.array,
        publicChannels: PropTypes.array,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
    };

    static defaultProps = {
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
        const {isSearch, matchTerm, myChannels, otherChannels, privateChannels, publicChannels, requestStatus} = nextProps;

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
            const {currentTeamId} = this.props;
            this.props.actions.searchChannels(currentTeamId, matchTerm);
            return;
        }

        if (requestStatus !== RequestStatus.STARTED &&
            (myChannels !== this.props.myChannels || otherChannels !== this.props.otherChannels ||
                privateChannels !== this.props.privateChannels || publicChannels !== this.props.publicChannels)) {
            // if the request is complete and the term is not null we show the autocomplete
            const sections = [];
            if (isSearch) {
                if (publicChannels.length) {
                    sections.push({
                        id: 'suggestion.search.public',
                        defaultMessage: 'Public Channels',
                        data: publicChannels,
                        key: 'publicChannels',
                    });
                }

                if (privateChannels.length) {
                    sections.push({
                        id: 'suggestion.search.private',
                        defaultMessage: 'Private Channels',
                        data: privateChannels,
                        key: 'privateChannels',
                    });
                }
            } else {
                if (myChannels.length) {
                    sections.push({
                        id: 'suggestion.mention.channels',
                        defaultMessage: 'My Channels',
                        data: myChannels,
                        key: 'myChannels',
                    });
                }

                if (otherChannels.length) {
                    sections.push({
                        id: 'suggestion.mention.morechannels',
                        defaultMessage: 'Other Channels',
                        data: otherChannels,
                        key: 'otherChannels',
                    });
                }
            }

            this.setState({
                sections,
            });

            this.props.onResultCountChange(sections.reduce((total, section) => total + section.data.length, 0));
        }
    }

    completeMention = (mention) => {
        const {cursorPosition, isSearch, onChangeText, value} = this.props;
        const mentionPart = value.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            const channelOrIn = mentionPart.includes('in:') ? 'in:' : 'channel:';
            completedDraft = mentionPart.replace(CHANNEL_MENTION_SEARCH_REGEX, `${channelOrIn} ${mention} `);
        } else {
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~${mention} `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
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
