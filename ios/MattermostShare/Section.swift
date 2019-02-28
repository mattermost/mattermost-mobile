import Foundation

class Section: NSObject, NSCopying {
  var title: String?
  var items: [Item] = []
  
  func copy(with zone: NSZone? = nil) -> Any {
    let copy = Section()
    copy.title = title
    copy.items = items
    return copy
  }
}
