import { vi } from 'vitest';
import { MemoryStorage } from './memoryStorage';

vi.stubGlobal('localStorage', new MemoryStorage());
