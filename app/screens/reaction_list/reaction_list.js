// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';

import {intlShape} from 'react-intl';

import SlideUpPanel from 'app/components/slide_up_panel';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {
    generateUserProfilesById,
    getMissingUserIds,
    getReactionsByName,
    getSortedReactionsForHeader,
    getUniqueUserIds,
    sortReactions,
} from 'app/utils/reaction';

import ReactionHeader from './reaction_header';
import ReactionRow from './reaction_row';

import {ALL_EMOJIS} from 'app/constants/emoji';

export default class ReactionList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getMissingProfilesByIds: PropTypes.func.isRequired,
        }).isRequired,
        navigator: PropTypes.object,
        reactions: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
        teammateNameDisplay: PropTypes.string,
        userProfiles: PropTypes.array,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);
        const {reactions, userProfiles} = props;
        const reactionsByName = getReactionsByName(reactions);

        this.state = {
            allUserIds: getUniqueUserIds(reactions),
            reactions,
            reactionsByName,
            selected: ALL_EMOJIS,
            sortedReactions: sortReactions(reactionsByName),
            sortedReactionsForHeader: getSortedReactionsForHeader(reactionsByName),
            userProfiles,
            userProfilesById: generateUserProfilesById(userProfiles),
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        let newState = null;
        if (nextProps.reactions !== prevState.reactions) {
            const {reactions} = nextProps;
            const reactionsByName = getReactionsByName(reactions);

            newState = {
                allUserIds: getUniqueUserIds(reactions),
                reactions,
                reactionsByName,
                sortedReactions: sortReactions(reactionsByName),
                sortedReactionsForHeader: getSortedReactionsForHeader(reactionsByName),
            };
        }

        if (nextProps.userProfiles !== prevState.userProfiles) {
            const userProfilesById = generateUserProfilesById(nextProps.userProfiles);
            if (newState) {
                newState.userProfilesById = userProfilesById;
            } else {
                newState = {userProfilesById};
            }
        }

        return newState;
    }

    componentDidMount() {
        this.getMissingProfiles();
    }

    componentDidUpdate(_, prevState) {
        if (prevState.allUserIds !== this.state.allUserIds) {
            this.getMissingProfiles();
        }
    }

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-reaction-list') {
                this.close();
            }
        }
    };

    close = () => {
        this.props.navigator.dismissModal({
            animationType: 'none',
        });
    };

    getMissingProfiles = () => {
        const {allUserIds, userProfiles, userProfilesById} = this.state;
        if (userProfiles.length !== allUserIds.length) {
            const missingUserIds = getMissingUserIds(userProfilesById, allUserIds);

            if (missingUserIds.length > 0) {
                this.props.actions.getMissingProfilesByIds(missingUserIds);
            }
        }
    }

    handleOnSelectReaction = (emoji) => {
        this.setState({selected: emoji});

        if (this.slideUpPanel) {
            this.slideUpPanel.getWrappedInstance().scrollToTop();
        }
    };

    refSlideUpPanel = (r) => {
        this.slideUpPanel = r;
    };

    renderReactionRows = () => {
        const {
            navigator,
            teammateNameDisplay,
            theme,
        } = this.props;
        const {
            reactionsByName,
            selected,
            sortedReactions,
            userProfilesById,
        } = this.state;
        const style = getStyleSheet(theme);
        const reactions = selected === ALL_EMOJIS ? sortedReactions : reactionsByName[selected];

        return reactions.map(({emoji_name: emojiName, user_id: userId}) => (
            <View
                key={emojiName + userId}
                style={style.rowContainer}
            >
                <ReactionRow
                    emojiName={emojiName}
                    navigator={navigator}
                    teammateNameDisplay={teammateNameDisplay}
                    theme={theme}
                    user={userProfilesById[userId]}
                />
                <View style={style.separator}/>
            </View>
        ));
    };

    renderHeader = (forwardedRef) => {
        const {theme} = this.props;
        const {selected, sortedReactionsForHeader} = this.state;

        return (
            <ReactionHeader
                selected={selected}
                onSelectReaction={this.handleOnSelectReaction}
                reactions={sortedReactionsForHeader}
                theme={theme}
                forwardedRef={forwardedRef}
            />
        );
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        return (
            <View style={style.flex}>
                <SlideUpPanel
                    ref={this.refSlideUpPanel}
                    onRequestClose={this.close}
                    initialPosition={0.55}
                    header={this.renderHeader}
                    headerHeight={37.5}
                >
                    {this.renderReactionRows()}
                </SlideUpPanel>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            flex: 1,
        },
        headerContainer: {
            height: 37.5,
        },
        rowContainer: {
            justifyContent: 'center',
            height: 45,
        },
        separator: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});
