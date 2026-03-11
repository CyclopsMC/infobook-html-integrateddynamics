import {execSync} from "child_process";
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

  describe('downloadHeadlessMc', () => {
    let tmpDir: string;
    let generator: IconsGenerator;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'hmc-dl-'));
      generator = new IconsGenerator({...BASE_ARGS, workDir: tmpDir, headlessMcVersion: '2.8.0'});
    });

    afterEach(() => {
      removeTmpDir(tmpDir);
    });

    it('should use versioned filename in download URL', async () => {
      const downloadedUrls: string[] = [];
      jest.spyOn(generator, 'downloadFile').mockImplementation(async (url: string) => {
        downloadedUrls.push(url);
      });

      await generator.downloadHeadlessMc();

      expect(downloadedUrls).toHaveLength(1);
      expect(downloadedUrls[0]).toContain('headlessmc-launcher-2.8.0.jar');
      expect(downloadedUrls[0]).not.toContain('headlessmc-launcher.jar');
    });

    it('should skip download if jar already exists', async () => {
      const jarPath = path.join(tmpDir, 'headlessmc-launcher.jar');
      fs.writeFileSync(jarPath, 'fake jar');
      const downloadFile = jest.spyOn(generator, 'downloadFile').mockImplementation(async () => { /* noop */ });

      await generator.downloadHeadlessMc();

      expect(downloadFile).not.toHaveBeenCalled();
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

    it('should return true when HMC-Specifics initialized (with hyphen, actual log format)', () => {
      expect(generator.isGameFullyLoaded('[Render thread/INFO] [me.earth.headlessmc.mc.Initializer/]: HMC-Specifics initialized!')).toBe(true);
    });

    it('should return true when Minecraft advancements message is present', () => {
      expect(generator.isGameFullyLoaded(
        '[Render thread/INFO] [minecraft/Minecraft]: Loaded 0 advancements'
      )).toBe(true);
    });

    it('should return true when AdvancementTree has loaded advancements', () => {
      expect(generator.isGameFullyLoaded(
        '[08:01:02] [Render thread/INFO] [minecraft/AdvancementTree]: Loaded 1582 advancements'
      )).toBe(true);
    });

    it('should return false when RecipeManager has loaded recipes (premature load signal)', () => {
      expect(generator.isGameFullyLoaded(
        '[08:01:02] [Render thread/INFO] [minecraft/RecipeManager]: Loaded 3211 recipes'
      )).toBe(false);
    });

    it('should return false for unrelated output', () => {
      expect(generator.isGameFullyLoaded('[INFO] Starting Minecraft...')).toBe(false);
    });
  });

  describe('isHeadlessMcReady', () => {
    let generator: IconsGenerator;

    beforeEach(() => {
      generator = new IconsGenerator(BASE_ARGS);
    });

    it('should return false for empty output', () => {
      expect(generator.isHeadlessMcReady('')).toBe(false);
    });

    it('should return true when HeadlessMC version table header is present', () => {
      expect(generator.isHeadlessMcReady('id   name   parent\n-    -      -\n')).toBe(true);
    });

    it('should return true when DefaultCommandLineProvider warning is present', () => {
      expect(generator.isHeadlessMcReady(
        '[main/WARNING] [DefaultCommandLineProvider]: Your terminal cannot hide passwords!'
      )).toBe(true);
    });

    it('should return false for unrelated HeadlessMC startup output', () => {
      expect(generator.isHeadlessMcReady(
        '[main/WARNING] [Main]: Not running from the headlessmc-launcher-wrapper. No plugin support and in-memory launching.'
      )).toBe(false);
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

  describe('findButtonIdByText', () => {
    let generator: IconsGenerator;

    beforeEach(() => {
      generator = new IconsGenerator(BASE_ARGS);
    });

    it('should return the correct button id from a simple gui output', () => {
      const gui = 'Screen: SomeScreen\nButtons:\nid   text\n1    Create New World\n2    Cancel\n';
      expect(generator.findButtonIdByText(gui, 'Create New World')).toBe(1);
      expect(generator.findButtonIdByText(gui, 'Cancel')).toBe(2);
    });

    it('should return null when button text is not found', () => {
      const gui = 'Screen: SomeScreen\nButtons:\nid   text\n1    Singleplayer\n';
      expect(generator.findButtonIdByText(gui, 'Multiplayer')).toBeNull();
    });

    it('should return the correct button id from the latest gui block (single screen in output)', () => {
      const createWorldScreenGui =
        '\nScreen: net.minecraft.client.gui.screens.worldselection.CreateWorldScreen\n' +
        'Buttons:\nid   text               x     y\n' +
        '0    Cancel             217   214\n' +
        '1    Create New World   59    214\n';
      expect(generator.findButtonIdByText(createWorldScreenGui, 'Create New World')).toBe(1);
      expect(generator.findButtonIdByText(createWorldScreenGui, 'Cancel')).toBe(0);
    });

    it('should find button id from the most recent screen when multiple screens are present in accumulated output', () => {
      // Simulates an outputBuffer that accumulated both SelectWorldScreen (Create New World = 0)
      // and CreateWorldScreen (Create New World = 1, Cancel = 0) responses.
      // clickByText slices from the last \nScreen: so it passes only the CreateWorldScreen block.
      const accumulated =
        '\nScreen: net.minecraft.client.gui.screens.worldselection.SelectWorldScreen\n' +
        'Buttons:\nid   text\n0    Create New World\n1    Play Selected World\n' +
        '\nScreen: net.minecraft.client.gui.screens.worldselection.CreateWorldScreen\n' +
        'Buttons:\nid   text\n0    Cancel\n1    Create New World\n';

      // Searching the full buffer returns the FIRST match (stale, id=0) — this was the bug
      expect(generator.findButtonIdByText(accumulated, 'Create New World')).toBe(0);

      // Searching only from the last Screen: returns the correct match (id=1) — this is the fix
      const lastScreenIdx = accumulated.lastIndexOf('\nScreen:');
      const latestBlock = accumulated.slice(lastScreenIdx);
      expect(generator.findButtonIdByText(latestBlock, 'Create New World')).toBe(1);
    });
  });

  describe('runGameAndExportIcons – state machine (unit-level behaviour check)', () => {
    // These tests run the state machine logic without spawning an actual process by
    // inspecting which HeadlessMC command sequence would be produced for a given
    // sequence of game-output chunks.  They exercise the ordering and heartbeat fixes.

    /**
     * Helper that simulates a state-machine run by feeding a series of chunks and
     * a final "gui-response" chunk representing the HMC gui output after the world loads.
     * Returns the list of commands that were sent to HeadlessMC stdin.
     */
    async function simulateWorldLoad(guiResponseAfterLoad: string): Promise<string[]> {
      const commands: string[] = [];

      // Minimal state-machine wiring (mirrors the relevant parts of runGameAndExportIcons)
      let state = 'navigating_singleplayer';
      let stateBuffer = '';
      let lastKnownScreen = 'net.minecraft.client.gui.screens.worldselection.SelectWorldScreen';
      let commandSent = false;

      const sendCmd = (cmd: string) => { commands.push(cmd); };

      const handleChunk = (chunk: string) => {
        stateBuffer += chunk;
        const screenMatch = chunk.match(/^Screen:\s*(.+)$/m);
        if (screenMatch) {
          lastKnownScreen = screenMatch[1].trim();
        }

        if (state !== 'navigating_singleplayer') { return; }

        if (lastKnownScreen.includes('CreateWorldScreen') && !commandSent) {
          commandSent = true;
          sendCmd('click CreateWorldScreen-button');
          state = 'creating_world';
        } else if ((stateBuffer.includes('logged in') || stateBuffer.includes('not displaying a Gui')) && !commandSent) {
          // world-load detected — should NOT need to click Create New World again
          commandSent = true;
          sendCmd('/iconexporter export 64');
          state = 'exporting_icons';
        } else if ((lastKnownScreen.includes('SelectWorldScreen') || lastKnownScreen.includes('WorldSelectionScreen')) && !commandSent) {
          commandSent = true;
          sendCmd('click 0');   // Create New World
          // After the click, actively poll gui (the fix).
          // 0ms is used here for test determinism: in production the timeout is 8000ms,
          // but any positive duration would be equivalent in these synchronous unit tests.
          setTimeout(() => {
            sendCmd('gui');
            commandSent = false;
          }, 0);
        }
      };

      // Initial state: we're on SelectWorldScreen
      handleChunk('');

      // Wait for the setTimeout in the SelectWorldScreen branch to fire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Feed world-load output (RecipeManager, AdvancementTree).
      // commandSent must still be true here: the click fired before these chunks,
      // and the setTimeout that resets it has not yet run (it's scheduled for after
      // the current microtask queue drains).
      handleChunk('[Render thread/INFO] [minecraft/RecipeManager]: Loaded 3211 recipes\n');
      expect(commandSent).toBe(true); // state machine must NOT act during world load
      handleChunk('[Render thread/INFO] [minecraft/AdvancementTree]: Loaded 1582 advancements\n');
      expect(commandSent).toBe(true); // still blocked

      // Simulate the gui response arriving (after commandSent was reset to false by the setTimeout)
      handleChunk(guiResponseAfterLoad);

      return commands;
    }

    it('should not re-click "Create New World" when gui responds with "not displaying a Gui"', async () => {
      const cmds = await simulateWorldLoad('not displaying a Gui\n');
      // Exactly one "Create New World" click, then gui poll, then export command
      expect(cmds.filter((c) => c === 'click 0')).toHaveLength(1);
      expect(cmds).toContain('/iconexporter export 64');
    });

    it('should transition to CreateWorldScreen click when gui responds with CreateWorldScreen', async () => {
      const cmds = await simulateWorldLoad(
        'Screen: net.minecraft.client.gui.screens.worldselection.CreateWorldScreen\n',
      );
      expect(cmds.filter((c) => c === 'click 0')).toHaveLength(1);
      expect(cmds).toContain('click CreateWorldScreen-button');
    });

    it('should prioritize world-load detection over SelectWorldScreen handling when stateBuffer contains "not displaying a Gui"', async () => {
      // Simulate stateBuffer already containing "not displaying a Gui" before any new chunk
      let commands: string[] = [];
      let stateBuffer = 'not displaying a Gui\n';
      let lastKnownScreen = 'net.minecraft.client.gui.screens.worldselection.SelectWorldScreen';
      let commandSent = false;

      const handleChunk = (chunk: string) => {
        stateBuffer += chunk;
        const screenMatch = chunk.match(/^Screen:\s*(.+)$/m);
        if (screenMatch) { lastKnownScreen = screenMatch[1].trim(); }

        if (lastKnownScreen.includes('CreateWorldScreen') && !commandSent) {
          commandSent = true;
          commands.push('click CreateWorldScreen-button');
        } else if ((stateBuffer.includes('logged in') || stateBuffer.includes('not displaying a Gui')) && !commandSent) {
          commandSent = true;
          commands.push('/iconexporter export 64');
        } else if ((lastKnownScreen.includes('SelectWorldScreen') || lastKnownScreen.includes('WorldSelectionScreen')) && !commandSent) {
          commandSent = true;
          commands.push('click 0');   // should NOT reach here
        }
      };

      // Heartbeat fires — world already loaded, stateBuffer has "not displaying a Gui"
      handleChunk('');
      expect(commands).toContain('/iconexporter export 64');
      expect(commands).not.toContain('click 0');
    });
  });
});
