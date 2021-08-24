// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Keyboard} from 'react-native';

import {goToScreen} from '@actions/navigation';
import {getDisplayNameForLanguage} from '@utils/markdown';
import {preventDoubleTap} from '@utils/tap';

import MarkdownCodeBlock from '../markdown_code_block/markdown_code_block';

export default class LatexCodeBlock extends MarkdownCodeBlock {
    static defaultProps = {
        language: 'latex',
    };

    handlePress = preventDoubleTap(() => {
        const {language, content} = this.props;
        const {intl} = this.context;
        const screen = 'Latex';
        const passProps = {
            content,
        };

        const languageDisplayName = getDisplayNameForLanguage(language);
        let title;
        if (languageDisplayName) {
            title = intl.formatMessage(
                {
                    id: 'mobile.routes.code',
                    defaultMessage: '{language} Code',
                },
                {
                    language: languageDisplayName,
                },
            );
        } else {
            title = intl.formatMessage({
                id: 'mobile.routes.code.noLanguage',
                defaultMessage: 'LaTeX Code',
            });
        }

        Keyboard.dismiss();
        requestAnimationFrame(() => {
            goToScreen(screen, title, passProps);
        });
    });
}
