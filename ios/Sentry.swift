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
if let SENTRY_ENABLED = Bundle.main.infoDictionary?["SENTRY_ENABLED"] as? String,
   let SENTRY_DSN = Bundle.main.infoDictionary?["SENTRY_DSN"] as? String {
    if(SENTRY_ENABLED=="true"){
      SentrySDK.start { options in
        options.dsn = SENTRY_DSN
        options.debug = true // Enabled debug when first installing is always helpful

        // Features turned off by default, but worth checking out
        options.enableAppHangTracking = true
        options.enableFileIOTracking = true
        options.enableCoreDataTracking = true
        options.enableCaptureFailedRequests = true
      }
    }
  }
}

func testSentry(msg: String){
  SentrySDK.capture(message: msg)
}
