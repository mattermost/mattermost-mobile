// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getRedirectLocation} from 'mattermost-redux/actions/general';
import {Preferences} from 'mattermost-redux/constants';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getOpenGraphMetadataForUrl} from 'mattermost-redux/selectors/entities/posts';
import {getBool, getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {showModalOverCurrentContext} from 'app/actions/navigation';
import {ViewTypes} from 'app/constants';
import {getDimensions} from 'app/selectors/device';
import {extractFirstLink} from 'app/utils/url';

import PostBodyAdditionalContent from './post_body_additional_content';

function makeGetFirstLink() {
    let link;
    let lastMessage;

    return (message) => {
        if (message !== lastMessage) {
            link = extractFirstLink(message);
            lastMessage = message;
        }

        return link;
    };
}

function getOpenGraphData(metadata, url) {
    if (!metadata || !metadata.embeds) {
        return null;
    }

    return metadata.embeds.find((embed) => {
        return embed.type === 'opengraph' && embed.url === url ? embed.data : null;
    });
}

function makeMapStateToProps() {
    const getFirstLink = makeGetFirstLink();

    return function mapStateToProps(state, ownProps) {
        const config = getConfig(state);
        const link = getFirstLink(ownProps.message);

        // Link previews used to be an advanced settings until server version 4.4 when it was changed to be a display setting.
        // We are checking both here until we bump the server requirement for the mobile apps.
        const previewsEnabled = (getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, `${ViewTypes.FEATURE_TOGGLE_PREFIX}${ViewTypes.EMBED_PREVIEW}`) ||
            getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true));

        const removeLinkPreview = ownProps.postProps.remove_link_preview === 'true';

        let openGraphData = getOpenGraphMetadataForUrl(state, link);
        if (!openGraphData) {
            const data = getOpenGraphData(ownProps.metadata, link);
            openGraphData = data?.data;
        }

        return {
            ...getDimensions(state),
            googleDeveloperKey: config.GoogleDeveloperKey,
            link,
            openGraphData,
            showLinkPreviews: previewsEnabled && config.EnableLinkPreviews === 'true' && !removeLinkPreview,
            theme: getTheme(state),
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getRedirectLocation,
            showModalOverCurrentContext,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostBodyAdditionalContent);
