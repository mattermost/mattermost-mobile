// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, SectionList} from 'react-native';

import {RequestStatus} from 'mattermost-redux/constants';
import {isMinimumServerVersion} from 'mattermost-redux/utils/helpers';
import {debounce} from 'mattermost-redux/actions/helpers';

import {CHANNEL_MENTION_REGEX, CHANNEL_MENTION_SEARCH_REGEX} from 'app/constants/autocomplete';
import AutocompleteDivider from 'app/components/autocomplete/autocomplete_divider';
import AutocompleteSectionHeader from 'app/components/autocomplete/autocomplete_section_header';
import ChannelMentionItem from 'app/components/autocomplete/channel_mention_item';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

export default class ChannelMention extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            searchChannels: PropTypes.func.isRequired,
            autocompleteChannelsForSearch: PropTypes.func.isRequired,
        }).isRequired,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        isSearch: PropTypes.bool,
        matchTerm: PropTypes.string,
        maxListHeight: PropTypes.number,
        myChannels: PropTypes.array,
        myMembers: PropTypes.object,
        otherChannels: PropTypes.array,
        onChangeText: PropTypes.func.isRequired,
        onResultCountChange: PropTypes.func.isRequired,
        privateChannels: PropTypes.array,
        publicChannels: PropTypes.array,
        directAndGroupMessages: PropTypes.array,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        value: PropTypes.string,
        serverVersion: PropTypes.string,
        isLandscape: PropTypes.bool.isRequired,
        nestedScrollEnabled: PropTypes.bool,
    };

    static defaultProps = {
        isSearch: false,
        value: '',
        publicChannels: [],
        privateChannels: [],
        directAndGroupMessages: [],
        myChannels: [],
        otherChannels: [],
    };

    constructor(props) {
        super(props);

        this.state = {
            sections: [],
        };
    }

    runSearch = debounce((currentTeamId, matchTerm) => {
        if (isMinimumServerVersion(this.props.serverVersion, 5, 4)) {
            this.props.actions.autocompleteChannelsForSearch(currentTeamId, matchTerm);
            return;
        }
        this.props.actions.searchChannels(currentTeamId, matchTerm);
    }, 200);

    componentWillReceiveProps(nextProps) {
        const {isSearch, matchTerm, myChannels, otherChannels, privateChannels, publicChannels, directAndGroupMessages, requestStatus, myMembers} = nextProps;

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
            const {currentTeamId} = this.props;
            this.runSearch(currentTeamId, matchTerm);
        }

        if (matchTerm === '' || (myChannels !== this.props.myChannels || otherChannels !== this.props.otherChannels ||
        privateChannels !== this.props.privateChannels || publicChannels !== this.props.publicChannels ||
        directAndGroupMessages !== this.props.directAndGroupMessages ||
        myMembers !== this.props.myMembers)) {
            const sections = [];
            if (isSearch) {
                if (publicChannels.length) {
                    sections.push({
                        id: t('suggestion.search.public'),
                        defaultMessage: 'Public Channels',
                        data: publicChannels.filter((cId) => myMembers[cId]),
                        key: 'publicChannels',
                        hideLoadingIndicator: true,
                    });
                }

                if (privateChannels.length) {
                    sections.push({
                        id: t('suggestion.search.private'),
                        defaultMessage: 'Private Channels',
                        data: privateChannels,
                        key: 'privateChannels',
                        hideLoadingIndicator: true,
                    });
                }

                if (directAndGroupMessages.length && isMinimumServerVersion(this.props.serverVersion, 5, 4)) {
                    sections.push({
                        id: t('suggestion.search.direct'),
                        defaultMessage: 'Direct Messages',
                        data: directAndGroupMessages,
                        key: 'directAndGroupMessages',
                    });
                }
            } else {
                if (myChannels.length) {
                    sections.push({
                        id: t('suggestion.mention.channels'),
                        defaultMessage: 'My Channels',
                        data: myChannels,
                        key: 'myChannels',
                        hideLoadingIndicator: true,
                    });
                }

                if (otherChannels.length || requestStatus === RequestStatus.STARTED) {
                    sections.push({
                        id: t('suggestion.mention.morechannels'),
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
        } else if (Platform.OS === 'ios') {
            // We are going to set a double ~ on iOS to prevent the auto correct from taking over and replacing it
            // with the wrong value, this is a hack but I could not found another way to solve it
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~~${mention} `);
        } else {
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~${mention} `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        onChangeText(completedDraft, true);

        if (Platform.OS === 'ios') {
            // This is the second part of the hack were we replace the double ~ with just one
            // after the auto correct vanished
            setTimeout(() => {
                onChangeText(completedDraft.replace(`~~${mention} `, `~${mention} `));
            });
        }
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
                loading={!section.hideLoadingIndicator && this.props.requestStatus === RequestStatus.STARTED}
                theme={this.props.theme}
                isLandscape={this.props.isLandscape}
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
        const {maxListHeight, theme, nestedScrollEnabled} = this.props;
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
                style={[style.listView, {maxHeight: maxListHeight}]}
                sections={sections}
                renderItem={this.renderItem}
                renderSectionHeader={this.renderSectionHeader}
                ItemSeparatorComponent={AutocompleteDivider}
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
        },
    };
});
