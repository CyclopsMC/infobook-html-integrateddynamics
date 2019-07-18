import {IInfobookPlugin, InfoBookInitializer, ResourceLoader} from "cyclops-infobook-html";
import {ISerializeContext} from "cyclops-infobook-html/lib/serialize/HtmlInfoBookSerializer";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerSqueezerRecipe";

/**
 * Infobook plugin for Integrated Dynamics.
 */
export class InfobookPluginIntegratedDynamics implements IInfobookPlugin {

  public readonly assetsPath = __dirname + '/../assets/';

  public load(infoBookInitializer: InfoBookInitializer, resourceLoader: ResourceLoader, config: any): void {
    infoBookInitializer.registerAppendixHandler('integrateddynamics:squeezer_recipe',
      new InfoBookAppendixHandlerSqueezerRecipe(resourceLoader.getResourceHandler(), 'registries'));
  }

  public getHeadSuffix(context: ISerializeContext): string {
    return `<link rel="stylesheet" href="${context.baseUrl}assets/styles-integrateddynamics.css">`;
  }

}
