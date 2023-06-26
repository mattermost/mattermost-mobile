//
//  NumberFormatter.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import Foundation

extension NumberFormatter {
  static let noFractionDigitsDecimalFormatter: NumberFormatter = {
    let numberFormatter = NumberFormatter()
    numberFormatter.maximumFractionDigits = 0
    numberFormatter.numberStyle = .decimal
    return numberFormatter
  }()

  static let oneFractionDigitDecimalFormatter: NumberFormatter = {
    let numberFormatter = NumberFormatter()
    numberFormatter.maximumFractionDigits = 1
    numberFormatter.numberStyle = .decimal
    return numberFormatter
  }()
}
