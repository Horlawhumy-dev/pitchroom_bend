@huggingface/transformers in package.json, and package-lock.json


Example: Speech to Text pipeline.

import { pipeline } from '@huggingface/transformers';
const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-large-v3');
const url = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav';
const output = await transcriber(url);
