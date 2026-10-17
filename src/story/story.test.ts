import { describe, expect, it } from 'vitest';
import { REGIONS } from '../course/catalog';
import { afterStoryId, bossStoryId, FINALE_STORY_ID, INTRO_STORY_ID, storyScene } from './story';

describe('story', () => {
  const lastRegion = REGIONS.at(-1);

  it('has the intro and the finale', () => {
    expect(storyScene(INTRO_STORY_ID)).toBeDefined();
    expect(storyScene(FINALE_STORY_ID)).toBeDefined();
  });

  it.each(REGIONS.map((region) => region.id))('introduces the %s boss', (regionId) => {
    expect(storyScene(bossStoryId(regionId))).toBeDefined();
  });

  it.each(REGIONS.filter((region) => region !== lastRegion).map((region) => region.id))(
    'follows the %s boss with a story',
    (regionId) => {
      expect(storyScene(afterStoryId(regionId))).toBeDefined();
    },
  );

  it('ends the last region with the finale instead of an after story', () => {
    expect(lastRegion && storyScene(afterStoryId(lastRegion.id))).toBeUndefined();
  });

  it('gives every line text in both languages', () => {
    const ids = [
      INTRO_STORY_ID,
      FINALE_STORY_ID,
      ...REGIONS.map((region) => bossStoryId(region.id)),
    ];
    for (const id of ids) {
      for (const line of storyScene(id)?.lines ?? []) {
        expect(line.text.pl.length).toBeGreaterThan(0);
        expect(line.text.uk.length).toBeGreaterThan(0);
      }
    }
  });
});
