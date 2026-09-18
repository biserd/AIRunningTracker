import AppKit

// Reuse the existing app artwork; normalize its size and remove alpha for Apple.
guard CommandLine.arguments.count == 3,
      let image = NSImage(contentsOfFile: CommandLine.arguments[1]),
      let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024,
        pixelsHigh: 1024, bitsPerSample: 8, samplesPerPixel: 3, hasAlpha: false,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Invalid icon input") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor(red: 1, green: 0.29, blue: 0, alpha: 1).setFill()
let bounds = NSRect(x: 0, y: 0, width: 1024, height: 1024)
bounds.fill()
context.imageInterpolation = .high
image.draw(in: bounds)
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot encode icon") }
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
