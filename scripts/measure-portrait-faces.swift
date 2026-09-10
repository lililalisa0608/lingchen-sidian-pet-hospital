import Foundation
import Vision

guard CommandLine.arguments.count > 1 else {
    fputs("usage: measure-portrait-faces.swift IMAGE...\n", stderr)
    exit(1)
}

for path in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: path)
    let request = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(url: url, options: [:])
    do {
        try handler.perform([request])
        let boxes = (request.results ?? []).map { observation in
            let box = observation.boundingBox
            return String(format: "x=%.4f y=%.4f w=%.4f h=%.4f", box.origin.x, box.origin.y, box.width, box.height)
        }
        print("\(path): \(boxes.joined(separator: "; "))")
    } catch {
        print("\(path): error \(error)")
    }
}
