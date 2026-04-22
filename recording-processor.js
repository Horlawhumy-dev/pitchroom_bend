class RecordingProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      console.log("Audio input data:", input[0]);
      this.port.postMessage(input[0]); // Send the first channel of the audio buffer
    } else {
      console.error("No valid input data in AudioWorkletProcessor.");
    }
    return true;
  }
}

registerProcessor("recording-processor", RecordingProcessor);
