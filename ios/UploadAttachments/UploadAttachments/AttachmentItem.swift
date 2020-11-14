import Foundation

public class AttachmentItem: NSObject {
    public var fileName: String?
    public var fileURL: URL?
    public var fileSize: UInt64 = 0
    public var type: String?
    public var imagePixels:  UInt64 = 0
    
    public override init() {}
}

