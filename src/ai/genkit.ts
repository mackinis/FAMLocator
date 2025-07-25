import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {NextjsPlugin} from '@genkit-ai/next';

export const ai = genkit({
  plugins: [googleAI(), NextjsPlugin()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
