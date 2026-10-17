import { describe, expect, it } from 'vitest';
import { CAMERA_POSITION, NO_INSETS } from './board';
import { CAMERA_INTRO_SECONDS, CameraRig } from './CameraRig';

const PRECISION = 6;

describe('CameraRig', () => {
  it('starts the intro farther away than the board view', () => {
    const rig = new CameraRig();
    expect(rig.camera.position.y).toBeGreaterThan(CAMERA_POSITION.y);
    expect(rig.camera.position.z).toBeGreaterThan(CAMERA_POSITION.z);
  });

  it('settles at the board view once the intro is over', () => {
    const rig = new CameraRig();
    rig.update(CAMERA_INTRO_SECONDS, 0);
    expect(rig.camera.position.y).toBeCloseTo(CAMERA_POSITION.y, PRECISION);
    expect(rig.camera.position.z).toBeCloseTo(CAMERA_POSITION.z, PRECISION);
  });

  it('keeps the framing of an empty viewport', () => {
    const rig = new CameraRig();
    const { fov } = rig.camera;
    rig.fit({ width: 0, height: 0 }, NO_INSETS);
    expect(rig.camera.fov).toBe(fov);
    expect(rig.camera.view).toBeNull();
  });

  it('frames the board for a real viewport', () => {
    const rig = new CameraRig();
    rig.fit({ width: 1280, height: 720 }, NO_INSETS);
    expect(rig.camera.view?.enabled).toBe(true);
  });
});
