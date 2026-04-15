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

const residences = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/residences' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      name: z.string(),
      detail: z.string(),
      image: image(),
      alt: z.string(),
      specs: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
    }),
});

export const collections = { neighbourhood, residences };
