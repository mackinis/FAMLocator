'use server';

/**
 * @fileOverview A location label suggestion AI agent.
 *
 * - suggestLocationLabel - A function that suggests a location label.
 * - SuggestLocationLabelInput - The input type for the suggestLocationLabel function.
 * - SuggestLocationLabelOutput - The return type for the suggestLocationLabel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLocationLabelInputSchema = z.object({
  latitude: z.number().describe('The latitude of the location.'),
  longitude: z.number().describe('The longitude of the location.'),
  activity: z
    .string()
    .optional()
    .describe('A description of what the user is currently doing.'),
});
export type SuggestLocationLabelInput = z.infer<typeof SuggestLocationLabelInputSchema>;

const SuggestLocationLabelOutputSchema = z.object({
  label: z
    .string()
    .describe(
      'A suggested label for the location, such as \'At work\', \'At school\', or \'At home\'.' // escaping quotes
    ),
});
export type SuggestLocationLabelOutput = z.infer<typeof SuggestLocationLabelOutputSchema>;

export async function suggestLocationLabel(
  input: SuggestLocationLabelInput
): Promise<SuggestLocationLabelOutput> {
  return suggestLocationLabelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLocationLabelPrompt',
  input: {schema: SuggestLocationLabelInputSchema},
  output: {schema: SuggestLocationLabelOutputSchema},
  prompt: `You are a location label suggestion AI agent.

  Given the following location (latitude: {{{latitude}}}, longitude: {{{longitude}}}), and activity ({{{activity}}}), suggest an appropriate label.

  The label should be short and descriptive, such as \'At work\', \'At school\', or \'At home\'.

  Return ONLY the suggested label. Do not include any other text in your response.`, // escaping quotes
});

const suggestLocationLabelFlow = ai.defineFlow(
  {
    name: 'suggestLocationLabelFlow',
    inputSchema: SuggestLocationLabelInputSchema,
    outputSchema: SuggestLocationLabelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
