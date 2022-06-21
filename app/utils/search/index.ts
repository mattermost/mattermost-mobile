import keyMirror from '@utils/key_mirror';
export const OptionsActions = keyMirror({
    DOWNLOAD: null,
    GOTO_CHANNEL: null,
    COPY_LINK: null,
});
export type OptionActionType = keyof typeof OptionsActions
