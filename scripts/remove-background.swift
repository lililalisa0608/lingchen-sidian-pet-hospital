import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Vision

guard CommandLine.arguments.count == 3 else {
    fputs("usage: remove-background input.png output.png\n", stderr)
    exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
guard let source = NSImage(contentsOf: inputURL),
      let cgImage = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    fputs("unable to read input image\n", stderr)
    exit(3)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(cgImage: cgImage)
try handler.perform([request])

guard let observation = request.results?.first else {
    fputs("no foreground mask generated\n", stderr)
    exit(4)
}

let maskBuffer = try observation.generateScaledMaskForImage(
    forInstances: observation.allInstances,
    from: handler
)

let sourceImage = CIImage(cgImage: cgImage)
let maskImage = CIImage(cvPixelBuffer: maskBuffer)
let transparent = CIImage(color: .clear).cropped(to: sourceImage.extent)
let filter = CIFilter.blendWithMask()
filter.inputImage = sourceImage
filter.backgroundImage = transparent
filter.maskImage = maskImage

guard let output = filter.outputImage else {
    fputs("unable to blend foreground mask\n", stderr)
    exit(5)
}

let context = CIContext()
try context.writePNGRepresentation(
    of: output,
    to: outputURL,
    format: .RGBA8,
    colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!
)
