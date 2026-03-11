import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {IconCompressor} from "../../lib/compress/IconCompressor";

// tslint:disable:object-literal-sort-keys
// tslint:disable:object-literal-key-quotes

function removeTmpDir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Create a minimal valid 1x1 PNG file for testing.
 * Uses a pre-encoded 1x1 transparent PNG (base64).
 */
function createTestPng(filePath: string): void {
  // Minimal 1×1 transparent PNG
  const minimalPng = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
    '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
    'hex',
  );
  fs.writeFileSync(filePath, minimalPng);
}

describe('IconCompressor', () => {
  describe('constructor', () => {
    it('should construct with valid iconsDir', () => {
      expect(() => new IconCompressor('/some/dir')).not.toThrow();
    });

    it('should throw when iconsDir is empty', () => {
      expect(() => new IconCompressor('')).toThrow('Missing iconsDir argument');
    });
  });

  describe('getOptipngPath', () => {
    let compressor: IconCompressor;

    beforeEach(() => {
      compressor = new IconCompressor('/some/dir');
    });

    it('should return a path ending with optipng or optipng.exe', () => {
      const p = compressor.getOptipngPath();
      expect(p).toMatch(/optipng(\.exe)?$/);
    });

    it('should return a path that exists', () => {
      const p = compressor.getOptipngPath();
      expect(fs.existsSync(p)).toBe(true);
    });
  });

  describe('compress', () => {
    let tmpDir: string;
    let compressor: IconCompressor;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compress-test-'));
      compressor = new IconCompressor(tmpDir);
    });

    afterEach(() => {
      removeTmpDir(tmpDir);
    });

    it('should report no files when directory is empty', async () => {
      const writeSpy = jest.spyOn(process.stdout, 'write');
      await compressor.compress();
      expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('No PNG files found'));
      writeSpy.mockRestore();
    });

    it('should compress PNG files in place', async () => {
      const pngPath = path.join(tmpDir, 'test.png');
      createTestPng(pngPath);
      const sizeBefore = fs.statSync(pngPath).size;

      await compressor.compress();

      // File should still exist
      expect(fs.existsSync(pngPath)).toBe(true);
      // File should be a valid PNG (starts with PNG signature)
      const header = Buffer.alloc(4);
      const fd = fs.openSync(pngPath, 'r');
      fs.readSync(fd, header, 0, 4, 0);
      fs.closeSync(fd);
      expect(header[1]).toBe(0x50); // 'P'
      expect(header[2]).toBe(0x4e); // 'N'
      expect(header[3]).toBe(0x47); // 'G'
    });

    it('should not touch non-PNG files', async () => {
      const txtPath = path.join(tmpDir, 'notes.txt');
      fs.writeFileSync(txtPath, 'hello world');
      const pngPath = path.join(tmpDir, 'icon.png');
      createTestPng(pngPath);

      await compressor.compress();

      expect(fs.readFileSync(txtPath, 'utf8')).toBe('hello world');
    });

    it('should report compression stats', async () => {
      const pngPath = path.join(tmpDir, 'icon.png');
      createTestPng(pngPath);
      const writeSpy = jest.spyOn(process.stdout, 'write');

      await compressor.compress();

      const calls = writeSpy.mock.calls.map((c) => c[0] as string);
      expect(calls.some((s) => s.includes('Compressed 1 icons'))).toBe(true);
      writeSpy.mockRestore();
    });

    it('should throw if optipng binary is not found', async () => {
      jest.spyOn(compressor, 'getOptipngPath').mockReturnValue('/nonexistent/optipng');
      await expect(compressor.compress()).rejects.toThrow(/OptiPNG binary not found/);
    });
  });
});
