import * as fs from "fs";
import * as path from "path";
import {IconsGenerator, IIconsGeneratorArgs} from "../../lib/modloader/IconsGenerator";

// tslint:disable:object-literal-sort-keys
// tslint:disable:object-literal-key-quotes

const BASE_ARGS: IIconsGeneratorArgs = {
  modsDir: '/tmp/test-mods',
  iconsDir: '/tmp/test-icons',
  workDir: '/tmp/test-hmc',
  minecraftVersion: '1.21.1',
  neoforgeVersion: '21.1.210',
};

function removeTmpDir(dir: string) {
  if (fs.existsSync(dir)) {
    const { execSync } = require('child_process');
    execSync(`rm -rf "${dir}"`);
  }
}

describe('IconsGenerator', () => {
  describe('constructor', () => {
    it('should construct with valid args', () => {
      expect(() => new IconsGenerator(BASE_ARGS)).not.toThrow();
    });

    it('should throw when modsDir is missing', () => {
      expect(() => new IconsGenerator({...BASE_ARGS, modsDir: ''}))
        .toThrow(new Error('Missing modsDir field for icons generation'));
    });

    it('should throw when iconsDir is missing', () => {
      expect(() => new IconsGenerator({...BASE_ARGS, iconsDir: ''}))
        .toThrow(new Error('Missing iconsDir field for icons generation'));
    });

    it('should throw when minecraftVersion is missing', () => {
      expect(() => new IconsGenerator({...BASE_ARGS, minecraftVersion: ''}))
        .toThrow(new Error('Missing minecraftVersion field for icons generation'));
    });

    it('should throw when neoforgeVersion is missing', () => {
      expect(() => new IconsGenerator({...BASE_ARGS, neoforgeVersion: ''}))
        .toThrow(new Error('Missing neoforgeVersion field for icons generation'));
    });

    it('should use default values for optional args', () => {
      const generator = new IconsGenerator(BASE_ARGS);
      expect(generator).toBeDefined();
    });
  });

  describe('writeHmcConfig', () => {
    let tmpDir: string;
    let generator: IconsGenerator;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hmc-test-'));
      generator = new IconsGenerator({...BASE_ARGS, workDir: tmpDir});
    });

    afterEach(() => {
      removeTmpDir(tmpDir);
    });

    it('should write config file', () => {
      generator.writeHmcConfig();
      const configPath = path.join(tmpDir, 'HeadlessMC', 'config.properties');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should write mcdir in config', () => {
      generator.writeHmcConfig();
      const configPath = path.join(tmpDir, 'HeadlessMC', 'config.properties');
      const config = fs.readFileSync(configPath, 'utf8');
      expect(config).toContain('hmc.mcdir=');
    });

    it('should disable jline in config', () => {
      generator.writeHmcConfig();
      const configPath = path.join(tmpDir, 'HeadlessMC', 'config.properties');
      const config = fs.readFileSync(configPath, 'utf8');
      expect(config).toContain('hmc.jline.enabled=false');
    });

    it('should create the config directory if it does not exist', () => {
      const configDir = path.join(tmpDir, 'HeadlessMC');
      expect(fs.existsSync(configDir)).toBe(false);
      generator.writeHmcConfig();
      expect(fs.existsSync(configDir)).toBe(true);
    });
  });

  describe('setupGameDirectory', () => {
    let tmpDir: string;
    let modsDir: string;
    let generator: IconsGenerator;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hmc-test-'));
      modsDir = path.join(tmpDir, 'mods-source');
      fs.mkdirSync(modsDir);
      generator = new IconsGenerator({
        ...BASE_ARGS,
        workDir: path.join(tmpDir, 'work'),
        modsDir,
      });
    });

    afterEach(() => {
      removeTmpDir(tmpDir);
    });

    it('should create the mods directory', async () => {
      await generator.setupGameDirectory();
      const modsTarget = path.join(tmpDir, 'work', 'game', 'mods');
      expect(fs.existsSync(modsTarget)).toBe(true);
    });

    it('should copy mod JARs from modsDir', async () => {
      const modFile = path.join(modsDir, 'test-mod.jar');
      fs.writeFileSync(modFile, 'fake jar content');

      await generator.setupGameDirectory();

      const copiedMod = path.join(tmpDir, 'work', 'game', 'mods', 'test-mod.jar');
      expect(fs.existsSync(copiedMod)).toBe(true);
    });

    it('should not copy non-JAR files', async () => {
      const txtFile = path.join(modsDir, 'readme.txt');
      fs.writeFileSync(txtFile, 'not a jar');

      await generator.setupGameDirectory();

      const copiedTxt = path.join(tmpDir, 'work', 'game', 'mods', 'readme.txt');
      expect(fs.existsSync(copiedTxt)).toBe(false);
    });

    it('should write options.txt for headless compatibility', async () => {
      await generator.setupGameDirectory();
      const optionsPath = path.join(tmpDir, 'work', 'game', 'options.txt');
      expect(fs.existsSync(optionsPath)).toBe(true);
      const options = fs.readFileSync(optionsPath, 'utf8');
      expect(options).toContain('pauseOnLostFocus:false');
      expect(options).toContain('onboardAccessibility:false');
    });
  });

  describe('isGameFullyLoaded', () => {
    let generator: IconsGenerator;

    beforeEach(() => {
      generator = new IconsGenerator(BASE_ARGS);
    });

    it('should return false for empty output', () => {
      expect(generator.isGameFullyLoaded('')).toBe(false);
    });

    it('should return true when "Mod loading complete" is present', () => {
      expect(generator.isGameFullyLoaded('[INFO] Mod loading complete')).toBe(true);
    });

    it('should return true when HMC Specifics initialized', () => {
      expect(generator.isGameFullyLoaded('[INFO] HMC Specifics initialized')).toBe(true);
    });

    it('should return true when Minecraft advancements message is present', () => {
      expect(generator.isGameFullyLoaded(
        '[Render thread/INFO] [minecraft/Minecraft]: Loaded 0 advancements'
      )).toBe(true);
    });

    it('should return false for unrelated output', () => {
      expect(generator.isGameFullyLoaded('[INFO] Starting Minecraft...')).toBe(false);
    });
  });

  describe('copyIcons', () => {
    let tmpDir: string;
    let generator: IconsGenerator;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hmc-icons-'));
      generator = new IconsGenerator({
        ...BASE_ARGS,
        workDir: path.join(tmpDir, 'work'),
        iconsDir: path.join(tmpDir, 'icons-output'),
      });
    });

    afterEach(() => {
      removeTmpDir(tmpDir);
    });

    it('should throw if export directory does not exist', async () => {
      await expect(generator.copyIcons()).rejects.toThrow(/Icon export directory not found/);
    });

    it('should copy PNG files from export directory', async () => {
      // Create mock export directory with icons
      const exportDir = path.join(tmpDir, 'work', 'game', 'icon-exports-x64');
      fs.mkdirSync(exportDir, { recursive: true });
      fs.writeFileSync(path.join(exportDir, 'minecraft__apple.png'), 'fake png');
      fs.writeFileSync(path.join(exportDir, 'minecraft__diamond.png'), 'fake png 2');
      fs.writeFileSync(path.join(exportDir, 'metadata.json'), 'not a png');

      await generator.copyIcons();

      const iconsOutput = path.join(tmpDir, 'icons-output');
      expect(fs.existsSync(path.join(iconsOutput, 'minecraft__apple.png'))).toBe(true);
      expect(fs.existsSync(path.join(iconsOutput, 'minecraft__diamond.png'))).toBe(true);
      expect(fs.existsSync(path.join(iconsOutput, 'metadata.json'))).toBe(false);
    });

    it('should create icons output directory if it does not exist', async () => {
      const exportDir = path.join(tmpDir, 'work', 'game', 'icon-exports-x64');
      fs.mkdirSync(exportDir, { recursive: true });
      fs.writeFileSync(path.join(exportDir, 'test.png'), 'fake png');

      const iconsOutput = path.join(tmpDir, 'icons-output');
      expect(fs.existsSync(iconsOutput)).toBe(false);

      await generator.copyIcons();

      expect(fs.existsSync(iconsOutput)).toBe(true);
    });
  });
});
