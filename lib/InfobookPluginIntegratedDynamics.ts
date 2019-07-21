// tslint:disable:max-line-length
import {IInfobookPlugin, InfoBookInitializer, ResourceLoader} from "cyclops-infobook-html";
import {ISerializeContext} from "cyclops-infobook-html/lib/serialize/HtmlInfoBookSerializer";
import {InfoBookAppendixHandlerAspect} from "./appendix/InfoBookAppendixHandlerAspect";
import {InfoBookAppendixHandlerDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalSqueezerRecipe";
import {InfoBookAppendixHandlerOperator} from "./appendix/InfoBookAppendixHandlerOperator";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerSqueezerRecipe";
import {InfoBookAppendixHandlerPartAspect} from "./appendix/InfoBookAppendixHandlerPartAspect";

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
    const aspectHandler = new InfoBookAppendixHandlerAspect(resourceLoader.getResourceHandler(), 'registries');
    infoBookInitializer.registerAppendixHandler('integrateddynamics:aspect', aspectHandler);
    infoBookInitializer.registerAppendixHandler('integrateddynamics:operator',
      new InfoBookAppendixHandlerOperator(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:operators_output',
      new InfoBookAppendixHandlerOperator(resourceLoader.getResourceHandler(), 'registries'));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:part_aspects',
      new InfoBookAppendixHandlerPartAspect(resourceLoader.getResourceHandler(), 'registries', aspectHandler));
  }

  public getHeadSuffix(context: ISerializeContext): string {
    return `<link rel="stylesheet" href="${context.baseUrl}assets/styles-integrateddynamics.css">`;
  }

}
