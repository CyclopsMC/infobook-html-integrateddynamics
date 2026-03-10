import {ChildProcess, spawn} from "child_process";
import * as fs from "fs";
import fetch, {RequestInit} from "node-fetch";
import {join} from "path";

/**
 * Generates icons using the IconExporter mod and HeadlessMC.
 * This class downloads HeadlessMC and the IconExporter mod, sets up a headless
 * Minecraft client with NeoForge and all specified mods, launches the game,
 * runs the iconexporter export command, and copies the resulting icons.
 */
export class IconsGenerator {

  private static readonly HEADLESSMC_JAR = 'headlessmc-launcher.jar';
  private static readonly ICONEXPORTER_JAR = 'iconexporter.jar';
  private static readonly HMC_GAME_SUBDIR = 'game';
  private static readonly HMC_CONFIG_SUBDIR = 'HeadlessMC';
  private static readonly ICON_EXPORT_SUBDIR = 'icon-exports-x64';
  private static readonly DEFAULT_ICON_SIZE = 64;

  private readonly modsDir: string;
  private readonly iconsDir: string;
  private readonly workDir: string;
  private readonly minecraftVersion: string;
  private readonly neoforgeVersion: string;
  private readonly githubToken: string;
  private readonly iconExporterArtifact: string;
  private readonly iconExporterVersion: string;
  private readonly headlessMcVersion: string;
  private readonly launchTimeoutMs: number;

  public constructor(args: IIconsGeneratorArgs) {
    if (!args.modsDir) {
      throw new Error('Missing modsDir field for icons generation');
    }
    if (!args.iconsDir) {
      throw new Error('Missing iconsDir field for icons generation');
    }
    if (!args.minecraftVersion) {
      throw new Error('Missing minecraftVersion field for icons generation');
    }
    if (!args.neoforgeVersion) {
      throw new Error('Missing neoforgeVersion field for icons generation');
    }

    this.modsDir = args.modsDir;
    this.iconsDir = args.iconsDir;
    this.workDir = args.workDir;
    this.minecraftVersion = args.minecraftVersion;
    this.neoforgeVersion = args.neoforgeVersion;
    this.githubToken = args.githubToken || process.env.GITHUB_TOKEN || '';
    this.iconExporterArtifact = args.iconExporterArtifact || `iconexporter-${args.minecraftVersion}-neoforge`;
    this.iconExporterVersion = args.iconExporterVersion || '1.4.0-174';
    this.headlessMcVersion = args.headlessMcVersion || '2.8.0';
    this.launchTimeoutMs = args.launchTimeoutMs || (30 * 60 * 1000); // 30 minutes
  }

  /**
   * Run the full icon generation pipeline.
   */
  public async generate(): Promise<void> {
    // Ensure working directory exists
    if (!fs.existsSync(this.workDir)) {
      await fs.promises.mkdir(this.workDir, { recursive: true });
    }

    process.stdout.write('Downloading HeadlessMC...\n');
    await this.downloadHeadlessMc();

    process.stdout.write('Downloading IconExporter...\n');
    await this.downloadIconExporter();

    process.stdout.write('Setting up mods directory...\n');
    await this.setupGameDirectory();

    process.stdout.write('Writing HeadlessMC config...\n');
    this.writeHmcConfig();

    process.stdout.write('Launching Minecraft to generate icons...\n');
    await this.runGameAndExportIcons();

    process.stdout.write('Copying icons to output...\n');
    await this.copyIcons();
  }

  /**
   * Download the HeadlessMC launcher jar.
   */
  public async downloadHeadlessMc(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.HEADLESSMC_JAR);
    if (fs.existsSync(jarPath)) {
      process.stdout.write('HeadlessMC already downloaded, skipping.\n');
      return;
    }

    const url = `https://github.com/headlesshq/headlessmc/releases/download/${this.headlessMcVersion}/headlessmc-launcher.jar`;
    await this.downloadFile(url, jarPath);
    process.stdout.write(`Downloaded HeadlessMC to ${jarPath}\n`);
  }

  /**
   * Download the IconExporter mod from GitHub Maven packages.
   */
  public async downloadIconExporter(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.ICONEXPORTER_JAR);
    if (fs.existsSync(jarPath)) {
      process.stdout.write('IconExporter already downloaded, skipping.\n');
      return;
    }

    const groupPath = 'org/cyclops/iconexporter';
    const url = `https://maven.pkg.github.com/CyclopsMC/packages/${groupPath}/${this.iconExporterArtifact}/${this.iconExporterVersion}/${this.iconExporterArtifact}-${this.iconExporterVersion}.jar`;

    const headers: Record<string, string> = {};
    if (this.githubToken) {
      headers['Authorization'] = `token ${this.githubToken}`;
    }

    await this.downloadFile(url, jarPath, headers);
    process.stdout.write(`Downloaded IconExporter to ${jarPath}\n`);
  }

  /**
   * Set up the game directory with mods and options.
   */
  public async setupGameDirectory(): Promise<void> {
    const gameDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR);
    const modsDir = join(gameDir, 'mods');

    if (!fs.existsSync(modsDir)) {
      await fs.promises.mkdir(modsDir, { recursive: true });
    }

    // Copy mods from server/mods directory
    if (fs.existsSync(this.modsDir)) {
      const mods = await fs.promises.readdir(this.modsDir);
      let copied = 0;
      for (const mod of mods) {
        if (mod.endsWith('.jar')) {
          await fs.promises.copyFile(join(this.modsDir, mod), join(modsDir, mod));
          copied++;
        }
      }
      process.stdout.write(`Copied ${copied} mods from ${this.modsDir} to ${modsDir}\n`);
    } else {
      process.stdout.write(`Warning: mods directory not found: ${this.modsDir}\n`);
    }

    // Copy IconExporter to mods directory
    const iconExporterSrc = join(this.workDir, IconsGenerator.ICONEXPORTER_JAR);
    if (fs.existsSync(iconExporterSrc)) {
      await fs.promises.copyFile(iconExporterSrc, join(modsDir, IconsGenerator.ICONEXPORTER_JAR));
      process.stdout.write('Added IconExporter to mods directory\n');
    }

    // Write options.txt to disable accessibility screen and pauseOnLostFocus
    const optionsPath = join(gameDir, 'options.txt');
    if (!fs.existsSync(optionsPath)) {
      await fs.promises.writeFile(optionsPath, 'pauseOnLostFocus:false\nonboardAccessibility:false\n');
    }
  }

  /**
   * Write the HeadlessMC configuration file.
   */
  public writeHmcConfig(): void {
    const configDir = join(this.workDir, IconsGenerator.HMC_CONFIG_SUBDIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const gameDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR);
    const configPath = join(configDir, 'config.properties');
    const config = [
      `hmc.mcdir=${gameDir}`,
      'hmc.jline.enabled=false',
    ].join('\n');

    fs.writeFileSync(configPath, config);
    process.stdout.write(`Wrote HeadlessMC config to ${configPath}\n`);
  }

  /**
   * Run the Minecraft client using HeadlessMC and export icons.
   */
  public async runGameAndExportIcons(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.HEADLESSMC_JAR);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn('java', [
        `-Dhmc.mcdir=${join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR)}`,
        '-jar', jarPath,
      ], {
        cwd: this.workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Disable ANSI escape sequences for easier parsing
          TERM: 'dumb',
          NO_COLOR: '1',
        },
      });

      let outputBuffer = '';
      let state: IGameState = 'waiting_for_prompt';
      let stateSettledAt: number = Date.now();
      let commandSent = false;

      const sendCommand = (command: string): void => {
        process.stdout.write(`[HMC] > ${command}\n`);
        proc.stdin.write(command + '\n');
      };

      const transitionTo = (newState: IGameState): void => {
        if (state !== newState) {
          process.stdout.write(`[HMC] State: ${state} -> ${newState}\n`);
          state = newState;
          stateSettledAt = Date.now();
          commandSent = false;
        }
      };

      const handleOutput = (chunk: string): void => {
        outputBuffer += chunk;
        // Keep buffer size manageable
        if (outputBuffer.length > 100000) {
          outputBuffer = outputBuffer.slice(outputBuffer.length - 20000);
        }

        switch (state) {
          case 'waiting_for_prompt':
            if (outputBuffer.includes('>') && !commandSent) {
              // HeadlessMC is ready for input - set offline and launch
              commandSent = true;
              sendCommand('offline true');
              // Allow a moment for offline mode to register
              setTimeout(() => {
                sendCommand(`launch neoforge:${this.minecraftVersion} -lwjgl -commands -specifics -offline`);
                transitionTo('game_launching');
              }, 1000);
            }
            break;

          case 'game_launching':
            // Wait for NeoForge to finish loading
            if (this.isGameFullyLoaded(outputBuffer) && !commandSent) {
              commandSent = true;
              // Wait a moment for hmc-specifics to be fully initialized
              setTimeout(() => {
                sendCommand('gui');
                transitionTo('checking_screen');
              }, 5000);
            }
            break;

          case 'checking_screen':
            if (outputBuffer.includes('TitleScreen') && !commandSent) {
              commandSent = true;
              sendCommand('click Singleplayer');
              transitionTo('navigating_singleplayer');
            } else if (outputBuffer.includes('Screen:') && !commandSent) {
              // Some other screen - check again
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 2000);
            } else if (Date.now() - stateSettledAt > 30000 && !commandSent) {
              // Timeout - try gui again
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                transitionTo('checking_screen');
              }, 2000);
            }
            break;

          case 'navigating_singleplayer':
            if (outputBuffer.includes('CreateWorldScreen') && !commandSent) {
              // Create a new world
              commandSent = true;
              sendCommand('click "Create New World"');
              transitionTo('creating_world');
            } else if (outputBuffer.includes('WorldSelectionScreen') && !commandSent) {
              // Try to create a new world from world selection screen
              commandSent = true;
              sendCommand('click "Create New World"');
              transitionTo('creating_world');
            } else if (outputBuffer.includes('SelectWorldScreen') && !commandSent) {
              commandSent = true;
              sendCommand('click "Create New World"');
              transitionTo('creating_world');
            } else if (Date.now() - stateSettledAt > 20000 && !commandSent) {
              // Fallback: check current GUI
              commandSent = true;
              sendCommand('gui');
              transitionTo('checking_screen');
            }
            break;

          case 'creating_world':
            // Wait for world to load - look for "logged in" or "not displaying a Gui"
            if ((outputBuffer.includes('logged in') || outputBuffer.includes('not displaying a Gui')) && !commandSent) {
              commandSent = true;
              // Wait for world to fully initialize
              setTimeout(() => {
                sendCommand(`/ iconexporter export ${IconsGenerator.DEFAULT_ICON_SIZE}`);
                transitionTo('exporting_icons');
              }, 3000);
            } else if (Date.now() - stateSettledAt > 120000 && !commandSent) {
              // Timeout waiting for world - try to proceed anyway
              commandSent = true;
              sendCommand(`/ iconexporter export ${IconsGenerator.DEFAULT_ICON_SIZE}`);
              transitionTo('exporting_icons');
            }
            break;

          case 'exporting_icons':
            // Wait for export to complete - IconExporter logs export progress
            if ((outputBuffer.includes('icon-exports') || outputBuffer.includes('Exported') ||
                outputBuffer.includes('iconexporter') || outputBuffer.includes('export complete')) && !commandSent) {
              // Give it extra time to finish writing all files
              setTimeout(() => {
                if (!commandSent) {
                  commandSent = true;
                  sendCommand('quit');
                  transitionTo('quitting');
                }
              }, 10000);
            } else if (Date.now() - stateSettledAt > 120000 && !commandSent) {
              // Timeout - try to quit anyway
              commandSent = true;
              process.stdout.write('[HMC] Warning: icon export may not have completed, quitting...\n');
              sendCommand('quit');
              transitionTo('quitting');
            }
            break;

          case 'quitting':
            // Just waiting for the process to end
            break;

          default:
            break;
        }
      };

      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        process.stdout.write(chunk);
        handleOutput(chunk);
      });

      proc.stderr.on('data', (data: Buffer) => {
        const errChunk = data.toString();
        process.stderr.write(errChunk);
        handleOutput(errChunk);
      });

      const launchTimeout = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`HeadlessMC timed out after ${this.launchTimeoutMs / 1000}s in state: ${state}`));
      }, this.launchTimeoutMs);

      proc.on('exit', (code) => {
        clearTimeout(launchTimeout);
        if (state === 'quitting' || code === 0) {
          resolve();
        } else {
          reject(new Error(`HeadlessMC exited with code ${code} in state: ${state}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(launchTimeout);
        reject(err);
      });
    });
  }

  /**
   * Copy exported icons to the output icons directory.
   */
  public async copyIcons(): Promise<void> {
    const exportDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR, IconsGenerator.ICON_EXPORT_SUBDIR);

    if (!fs.existsSync(exportDir)) {
      throw new Error(`Icon export directory not found: ${exportDir}. Make sure the IconExporter command ran successfully.`);
    }

    if (!fs.existsSync(this.iconsDir)) {
      await fs.promises.mkdir(this.iconsDir, { recursive: true });
    }

    const files = await fs.promises.readdir(exportDir);
    const pngFiles = files.filter((f) => f.endsWith('.png'));

    for (const file of pngFiles) {
      await fs.promises.copyFile(join(exportDir, file), join(this.iconsDir, file));
    }

    process.stdout.write(`Copied ${pngFiles.length} icons to ${this.iconsDir}\n`);
  }

  /**
   * Determine if the Minecraft game has fully loaded based on log output.
   */
  public isGameFullyLoaded(output: string): boolean {
    // NeoForge loading complete indicator
    return output.includes('Mod loading complete') ||
      output.includes('[minecraft/Minecraft]: Loaded 0 advancements') ||
      output.includes('HMC Specifics initialized') ||
      (output.includes('[Render thread/INFO]') && output.includes('Loaded '));
  }

  /**
   * Download a file from a URL to a destination path.
   */
  public async downloadFile(url: string, destPath: string, headers?: Record<string, string>): Promise<void> {
    const options: RequestInit = {};
    if (headers && Object.keys(headers).length > 0) {
      options.headers = headers;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
    }

    const parentDir = join(destPath, '..');
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(destPath);
      response.body
        .on('error', reject)
        .pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

}

export type IGameState =
  'waiting_for_prompt' |
  'game_launching' |
  'checking_screen' |
  'navigating_singleplayer' |
  'creating_world' |
  'exporting_icons' |
  'quitting';

export interface IIconsGeneratorArgs {
  /**
   * Directory containing mod JARs to include in the client (usually server/mods).
   */
  modsDir: string;
  /**
   * Directory where icons will be written.
   */
  iconsDir: string;
  /**
   * Working directory for HeadlessMC and game files.
   */
  workDir: string;
  /**
   * Minecraft version (e.g., "1.21.1").
   */
  minecraftVersion: string;
  /**
   * NeoForge version (e.g., "21.1.210").
   */
  neoforgeVersion: string;
  /**
   * GitHub token for downloading from GitHub Packages.
   * Falls back to GITHUB_TOKEN environment variable.
   */
  githubToken?: string;
  /**
   * Maven artifact ID for IconExporter (default: iconexporter-{minecraftVersion}-neoforge).
   */
  iconExporterArtifact?: string;
  /**
   * Version of the IconExporter artifact to download (e.g., "1.4.0-174").
   */
  iconExporterVersion?: string;
  /**
   * Version of HeadlessMC to download (e.g., "2.8.0").
   */
  headlessMcVersion?: string;
  /**
   * Timeout in milliseconds for the full game launch and icon export (default: 30 minutes).
   */
  launchTimeoutMs?: number;
}
