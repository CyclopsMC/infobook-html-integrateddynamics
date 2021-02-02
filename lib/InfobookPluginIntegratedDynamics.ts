// tslint:disable:max-line-length
import {IInfobookPlugin, InfoBookInitializer, ResourceLoader} from "cyclops-infobook-html";
import {ISerializeContext} from "cyclops-infobook-html/lib/serialize/HtmlInfoBookSerializer";
import {InfoBookAppendixHandlerAspect} from "./appendix/InfoBookAppendixHandlerAspect";
import {InfoBookAppendixHandlerDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalDryingBasinRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalDryingBasinRecipe";
import {InfoBookAppendixHandlerMechanicalSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerMechanicalSqueezerRecipe";
import {InfoBookAppendixHandlerOperator} from "./appendix/InfoBookAppendixHandlerOperator";
import {InfoBookAppendixHandlerPartAspect} from "./appendix/InfoBookAppendixHandlerPartAspect";
import {InfoBookAppendixHandlerSqueezerRecipe} from "./appendix/InfoBookAppendixHandlerSqueezerRecipe";

/**
 * Infobook plugin for Integrated Dynamics.
 */
export class InfobookPluginIntegratedDynamics implements IInfobookPlugin {

  public readonly assetsPath = __dirname + '/../assets/';

  public load(infoBookInitializer: InfoBookInitializer, resourceLoader: ResourceLoader, config: any): void {
    infoBookInitializer.registerAppendixHandler('integrateddynamics:squeezer',
      new InfoBookAppendixHandlerSqueezerRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:mechanical_squeezer',
      new InfoBookAppendixHandlerMechanicalSqueezerRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:drying_basin',
      new InfoBookAppendixHandlerDryingBasinRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
    infoBookInitializer.registerAppendixHandler('integrateddynamics:mechanical_drying_basin',
      new InfoBookAppendixHandlerMechanicalDryingBasinRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
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
