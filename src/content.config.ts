import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const neighbourhood = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/neighbourhood' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      label: z.string(),
      layout: z.enum(['a', 'b', 'c', 'd']),
      image: image(),
      alt: z.string(),
      mapEmbed: z.string().url(),
      description: z.string(),
    }),
});

export const collections = { neighbourhood };
