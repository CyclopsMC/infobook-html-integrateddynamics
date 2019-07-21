// tslint:disable:max-line-length
import {IInfobookPlugin, InfoBookInitializer, ResourceLoader} from "cyclops-infobook-html";
import {ISerializeContext} from "cyclops-infobook-html/lib/serialize/HtmlInfoBookSerializer";
import {InfoBookAppendixHandlerAspect} from "./appendix/InfoBookAppendixHandlerAspect";
import {InfoBookAppendixHandlerDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalSqueezerRecipe";
import {InfoBookAppendixHandlerOperator} from "./appendix/InfoBookAppendixHandlerOperator";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerSqueezerRecipe";

/**
 * Infobook plugin for Integrated Dynamics.
 */
export class InfobookPluginIntegratedDynamics implements IInfobookPlugin {

  public readonly assetsPath = __dirname + '/../assets/';

  public load(infoBookInitializer: InfoBookInitializer, resourceLoader: ResourceLoader, config: any): void {
    infoBookInitializer.registerAppendixHandler('integrateddynamics:squeezer_recipe',
      new InfoBookAppendixHandlerSqueezerRecipe(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:mechanical_squeezer_recipe',
      new InfoBookAppendixHandlerMechanicalSqueezerRecipe(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:drying_basin_recipe',
      new InfoBookAppendixHandlerDryingBasinRecipe(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:mechanical_drying_basin_recipe',
      new InfoBookAppendixHandlerMechanicalDryingBasinRecipe(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:aspect',
      new InfoBookAppendixHandlerAspect(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:operator',
      new InfoBookAppendixHandlerOperator(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:operators_output',
      new InfoBookAppendixHandlerOperator(resourceLoader.getResourceHandler(), 'registries'));
  }

  public getHeadSuffix(context: ISerializeContext): string {
    return `<link rel="stylesheet" href="${context.baseUrl}assets/styles-integrateddynamics.css">`;
  }

}
