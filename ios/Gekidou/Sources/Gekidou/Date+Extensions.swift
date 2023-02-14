//
//  Date+Extensions.swift
//  
//
//  Created by Miguel Alatzar on 8/24/21.
//

import Foundation

extension Date {
  var millisecondsSince1970: Int {
    return Int((self.timeIntervalSince1970 * 1000.0).rounded())
  }
  
  init(milliseconds: Int) {
    self = Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000)
  }
}
