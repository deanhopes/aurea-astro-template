import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const neighbourhood = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/neighbourhood' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      label: z.string(),
      layout: z.enum(['a', 'b']),
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
      heading: z.string(),
      slug: z.string(),
      detail: z.string(),
      description: z.string(),
      image: image(),
      alt: z.string(),
      gallery: z.array(
        z.object({
          src: image(),
          alt: z.string(),
        }),
      ),
      roomOverview: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
      bedsAndBedding: z.array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      ),
    }),
});

const lifestyle = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/lifestyle' }),
  schema: ({ image }) =>
    z.object({
      order: z.number(),
      image: image(),
      alt: z.string(),
      top: z.string(),
      bottom: z.string(),
    }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/pages' }),
  schema: ({ image }) =>
    z.object({
      label: z.string(),
      towerBody: z.string(),
      cardCopy: z.array(z.string()),
      cta: z.object({
        label: z.string(),
        href: z.string(),
      }),
      images: z.object({
        tower: z.object({ src: image(), alt: z.string() }),
        interior: z.object({ src: image(), alt: z.string() }),
        entrance: z.object({ src: image(), alt: z.string() }),
        video: z.object({ src: z.string(), alt: z.string() }),
      }),
      captions: z.object({
        towerNumber: z.string(),
        interiorMuted: z.string(),
        interiorNumber: z.string(),
      }),
    }),
});

export const collections = { neighbourhood, residences, lifestyle, pages };
