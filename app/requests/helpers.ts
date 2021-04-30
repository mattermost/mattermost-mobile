// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

//fixme: do we really need this ?
export class FormattedError extends Error {
  private intl: {
      values: any;
      defaultMessage: string;
      id: string
  };

  constructor(id: string, defaultMessage: string, values: any = {}) {
      super(defaultMessage);
      this.intl = {
          id,
          defaultMessage,
          values,
      };
  }
}
