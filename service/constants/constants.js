// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import imageIcon from 'assets/images/icons/image.png';
import audioIcon from 'assets/images/icons/audio.png';
import videoIcon from 'assets/images/icons/video.png';
import excelIcon from 'assets/images/icons/excel.png';
import pptIcon from 'assets/images/icons/ppt.png';
import pdfIcon from 'assets/images/icons/pdf.png';
import codeIcon from 'assets/images/icons/code.png';
import wordIcon from 'assets/images/icons/word.png';
import patchIcon from 'assets/images/icons/patch.png';
import genericIcon from 'assets/images/icons/generic.png';

const Constants = {
    POST_CHUNK_SIZE: 60,
    PROFILE_CHUNK_SIZE: 100,
    CHANNELS_CHUNK_SIZE: 50,
    SEARCH_TIMEOUT_MILLISECONDS: 100,

    MENTION: 'mention',

    OFFLINE: 'offline',
    AWAY: 'away',
    ONLINE: 'online',

    TEAM_USER_ROLE: 'team_user',
    TEAM_ADMIN_ROLE: 'team_admin',

    CHANNEL_USER_ROLE: 'channel_user',
    CHANNEL_ADMIN_ROLE: 'channel_admin',

    DEFAULT_CHANNEL: 'town-square',
    DM_CHANNEL: 'D',
    OPEN_CHANNEL: 'O',
    PRIVATE_CHANNEL: 'P',

    POST_DELETED: 'DELETED',
    SYSTEM_MESSAGE_PREFIX: 'system_',

    CATEGORY_DIRECT_CHANNEL_SHOW: 'direct_channel_show',
    CATEGORY_DISPLAY_SETTINGS: 'display_settings',
    CATEGORY_FAVORITE_CHANNEL: 'favorite_channel',
    DISPLAY_PREFER_NICKNAME: 'nickname_full_name',
    DISPLAY_PREFER_FULL_NAME: 'full_name',

    POST_HEADER_CHANGE: 'system_header_change',
    POST_PURPOSE_CHANGE: 'system_purpose_change'
};

const FileConstants = {
    IMAGE_TYPES: ['jpg', 'gif', 'bmp', 'png', 'jpeg'],
    AUDIO_TYPES: ['mp3', 'wav', 'wma', 'm4a', 'flac', 'aac', 'ogg'],
    VIDEO_TYPES: ['mp4', 'avi', 'webm', 'mkv', 'wmv', 'mpg', 'mov', 'flv'],
    PRESENTATION_TYPES: ['ppt', 'pptx'],
    SPREADSHEET_TYPES: ['xlsx', 'csv'],
    WORD_TYPES: ['doc', 'docx'],
    CODE_TYPES: ['as', 'applescript', 'osascript', 'scpt', 'bash', 'sh', 'zsh', 'clj', 'boot', 'cl2', 'cljc', 'cljs', 'cljs.hl', 'cljscm', 'cljx', 'hic', 'coffee', '_coffee', 'cake', 'cjsx', 'cson', 'iced', 'cpp', 'c', 'cc', 'h', 'c++', 'h++', 'hpp', 'cs', 'csharp', 'css', 'd', 'di', 'dart', 'delphi', 'dpr', 'dfm', 'pas', 'pascal', 'freepascal', 'lazarus', 'lpr', 'lfm', 'diff', 'django', 'jinja', 'dockerfile', 'docker', 'erl', 'f90', 'f95', 'fsharp', 'fs', 'gcode', 'nc', 'go', 'groovy', 'handlebars', 'hbs', 'html.hbs', 'html.handlebars', 'hs', 'hx', 'java', 'jsp', 'js', 'jsx', 'json', 'jl', 'kt', 'ktm', 'kts', 'less', 'lisp', 'lua', 'mk', 'mak', 'md', 'mkdown', 'mkd', 'matlab', 'm', 'mm', 'objc', 'obj-c', 'ml', 'perl', 'pl', 'php', 'php3', 'php4', 'php5', 'php6', 'ps', 'ps1', 'pp', 'py', 'gyp', 'r', 'ruby', 'rb', 'gemspec', 'podspec', 'thor', 'irb', 'rs', 'scala', 'scm', 'sld', 'scss', 'st', 'sql', 'swift', 'tex', 'txt', 'vbnet', 'vb', 'bas', 'vbs', 'v', 'veo', 'xml', 'html', 'xhtml', 'rss', 'atom', 'xsl', 'plist', 'yaml'],
    PDF_TYPES: ['pdf'],
    PATCH_TYPES: ['patch'],

    ICON_PATH_FROM_FILE_TYPE: {
        image: imageIcon,
        audio: audioIcon,
        video: videoIcon,
        spreadsheet: excelIcon,
        presentation: pptIcon,
        pdf: pdfIcon,
        code: codeIcon,
        word: wordIcon,
        patch: patchIcon,
        other: genericIcon
    }
};

export default {
    ...Constants,
    ...FileConstants
};
