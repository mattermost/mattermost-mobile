//
//  Sentry.swift
//  Mattermost
//
//  Created by Avinash Lingaloo on 16/12/2022.
//  Copyright © 2022 Facebook. All rights reserved.
//

import Foundation

import Sentry

func initSentryAppExt(){
  SentrySDK.start { options in
    options.dsn = "https://8166acfeeced43de98bc11f217d871c5@o1347733.ingest.sentry.io/6734065"
      options.debug = true // Enabled debug when first installing is always helpful

      // Features turned off by default, but worth checking out
      options.enableAppHangTracking = true
      options.enableFileIOTracking = true
      options.enableCoreDataTracking = true
      options.enableCaptureFailedRequests = true
  }
}
