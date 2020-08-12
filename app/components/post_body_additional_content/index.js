// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getRedirectLocation} from '@mm-redux/actions/general';
import {Preferences} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getOpenGraphMetadataForUrl as selectOpenGraphMetadataForUrl, getExpandedLink as selectExpandedLink} from '@mm-redux/selectors/entities/posts';
import {getBool, getTheme} from '@mm-redux/selectors/entities/preferences';

import {ViewTypes} from 'app/constants';
import {getDimensions} from 'app/selectors/device';

import PostBodyAdditionalContent from './post_body_additional_content';

function selectOpenGraphData(metadata, url) {
    if (!metadata || !metadata.embeds) {
        return null;
    }

    return metadata.embeds.find((embed) => {
        return embed.type === 'opengraph' && embed.url === url ? embed.data : null;
    });
}

function mapStateToProps(state, ownProps) {
    const config = getConfig(state);
    const link = ownProps.metadata.embeds[0]?.url || '';
    let expandedLink;
    if (link) {
        expandedLink = selectExpandedLink(state, link);
    }

    // Link previews used to be an advanced settings until server version 4.4 when it was changed to be a display setting.
    // We are checking both here until we bump the server requirement for the mobile apps.
    const previewsEnabled = (getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, `${ViewTypes.FEATURE_TOGGLE_PREFIX}${ViewTypes.EMBED_PREVIEW}`) ||
        getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.LINK_PREVIEW_DISPLAY, true));

    const removeLinkPreview = ownProps.postProps.remove_link_preview === 'true';

    let openGraphData = selectOpenGraphMetadataForUrl(state, ownProps.postId, link);
    if (!openGraphData) {
        const data = selectOpenGraphData(ownProps.metadata, link);
        openGraphData = data?.data;
    }

    return {
        ...getDimensions(state),
        googleDeveloperKey: config.GoogleDeveloperKey,
        link,
        expandedLink,
        openGraphData,
        showLinkPreviews: previewsEnabled && config.EnableLinkPreviews === 'true' && !removeLinkPreview,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            getRedirectLocation,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostBodyAdditionalContent);
